package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"

	"github.com/teledrive/teledrive/domain"
	"github.com/teledrive/teledrive/infrastructure/config"
	tginfra "github.com/teledrive/teledrive/infrastructure/telegram"
)

// AuthUsecase handles authentication flows including Telegram phone code verification.
type AuthUsecase struct {
	authRepo   domain.AuthRepository
	userRepo   domain.UserRepository
	config     *config.Config
	clientPool *tginfra.ClientPool
}

// NewAuthUsecase creates a new AuthUsecase.
func NewAuthUsecase(
	authRepo domain.AuthRepository,
	userRepo domain.UserRepository,
	cfg *config.Config,
	clientPool *tginfra.ClientPool,
) *AuthUsecase {
	return &AuthUsecase{
		authRepo:   authRepo,
		userRepo:   userRepo,
		config:     cfg,
		clientPool: clientPool,
	}
}

// SendCodeResult contains the result of a SendCode operation.
type SendCodeResult struct {
	TransactionID string `json:"transaction_id"`
}

// SendCode initiates the Telegram auth flow by sending a verification code to the phone.
func (uc *AuthUsecase) SendCode(phone string) (*SendCodeResult, error) {
	// Validate phone against whitelist.
	if !uc.config.IsPhoneAllowed(phone) {
		return nil, fmt.Errorf("phone number %s is not allowed", phone)
	}

	// Create session store.
	sessionStore := tginfra.NewSessionStore(nil, uc.config.EncryptionKey, 0)
	
	// Start temporary client in the background.
	client, runCtx, cancel, err := uc.clientPool.StartTempClient(sessionStore)
	if err != nil {
		return nil, err
	}

	var phoneCodeHash string
	api := client.API()

	// Send the auth code using the client's running context.
	sentCode, err := api.AuthSendCode(runCtx, &tg.AuthSendCodeRequest{
		PhoneNumber: phone,
		APIID:       uc.config.TelegramAPIID,
		APIHash:     uc.config.TelegramAPIHash,
		Settings:    tg.CodeSettings{},
	})
	if err != nil {
		cancel() // Stop connection if it fails
		return nil, fmt.Errorf("failed to send auth code: %w", err)
	}

	switch v := sentCode.(type) {
	case *tg.AuthSentCode:
		phoneCodeHash = v.PhoneCodeHash
	default:
		cancel()
		return nil, fmt.Errorf("unexpected response type from AuthSendCode")
	}

	// Register temp client under the transaction ID so it stays running for the sign-in step.
	txID := uuid.New().String()
	uc.clientPool.RegisterTempClient(txID, client, sessionStore, cancel)

	// Store the transaction in DB.
	authTx := &domain.AuthTransaction{
		ID:            txID,
		Phone:         phone,
		PhoneCodeHash: phoneCodeHash,
	}
	if err := uc.authRepo.Create(authTx); err != nil {
		uc.clientPool.RemoveTempClient(txID) // Clean up temp client if DB storage fails
		return nil, fmt.Errorf("failed to store auth transaction: %w", err)
	}

	return &SendCodeResult{TransactionID: txID}, nil
}

// SignInResult contains the result of a SignIn operation.
type SignInResult struct {
	Token string       `json:"token"`
	User  *domain.User `json:"user"`
}

// SignIn completes the authentication flow using the verification code.
func (uc *AuthUsecase) SignIn(transactionID string, code string, password string) (*SignInResult, error) {
	// Load the pending transaction.
	authTx, err := uc.authRepo.GetByID(transactionID)
	if err != nil {
		return nil, fmt.Errorf("invalid transaction: %w", err)
	}

	// Retrieve the running temp client from the pool.
	client, sessionStore, ok := uc.clientPool.GetTempClient(transactionID)
	if !ok {
		return nil, fmt.Errorf("sign-in transaction expired or not found")
	}

	var tgUser *tg.User
	api := client.API()

	// Execute API calls with a timeout context.
	ctx, cancelCall := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancelCall()

	// Sign in with the code.
	authorization, err := api.AuthSignIn(ctx, &tg.AuthSignInRequest{
		PhoneNumber:   authTx.Phone,
		PhoneCodeHash: authTx.PhoneCodeHash,
		PhoneCode:     code,
	})
	if err != nil {
		// Check if 2FA is required.
		if password != "" {
			pwErr := auth.NewFlow(
				auth.Constant(authTx.Phone, password, auth.CodeAuthenticatorFunc(
					func(ctx context.Context, sentCode *tg.AuthSentCode) (string, error) {
						return code, nil
					},
				)),
				auth.SendCodeOptions{},
			).Run(ctx, client.Auth())
			if pwErr != nil {
				// Don't close/remove the client yet, user might retry password.
				return nil, fmt.Errorf("2FA authentication failed: %w", pwErr)
			}
			// After 2FA, get self.
			self, selfErr := api.UsersGetUsers(ctx, []tg.InputUserClass{&tg.InputUserSelf{}})
			if selfErr != nil {
				return nil, fmt.Errorf("failed to get self after 2FA: %w", selfErr)
			}
			if len(self) > 0 {
				if u, ok := self[0].(*tg.User); ok {
					tgUser = u
				}
			}
		} else {
			// If it's a 2FA prompt error, do NOT remove client yet.
			// Let's check if the error is SESSION_PASSWORD_NEEDED.
			// If it is not SESSION_PASSWORD_NEEDED, we clean up the transaction client.
			if !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
				errMsg := err.Error()
				if !strings.Contains(errMsg, "SESSION_PASSWORD_NEEDED") && !strings.Contains(errMsg, "PASSWORD_HASH_INVALID") {
					uc.clientPool.RemoveTempClient(transactionID)
				}
			}
			return nil, fmt.Errorf("sign in failed: %w", err)
		}
	} else {
		// Extract user from authorization response.
		switch v := authorization.(type) {
		case *tg.AuthAuthorization:
			if u, ok := v.User.(*tg.User); ok {
				tgUser = u
			}
		case *tg.AuthAuthorizationSignUpRequired:
			uc.clientPool.RemoveTempClient(transactionID)
			return nil, fmt.Errorf("sign up is required but not supported")
		default:
			uc.clientPool.RemoveTempClient(transactionID)
			return nil, fmt.Errorf("unexpected authorization response type")
		}
	}

	if tgUser == nil {
		return nil, fmt.Errorf("failed to get user information after sign in")
	}

	// Get encrypted session from the temp store.
	encryptedSession, err := sessionStore.GetEncryptedSession()
	if err != nil {
		log.Printf("warning: failed to get encrypted session: %v", err)
		encryptedSession = ""
	}

	// Create or update user in DB.
	existingUser, err := uc.userRepo.GetByTelegramID(tgUser.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	var user *domain.User
	if existingUser != nil {
		// Update existing user's session.
		if encryptedSession != "" {
			if err := uc.userRepo.UpdateSession(existingUser.ID, encryptedSession); err != nil {
				return nil, fmt.Errorf("failed to update user session: %w", err)
			}
		}
		user = existingUser
	} else {
		// Create new user.
		user, err = uc.userRepo.Create(&domain.User{
			TelegramID:  tgUser.ID,
			Phone:       authTx.Phone,
			Username:    tgUser.Username,
			FirstName:   tgUser.FirstName,
			LastName:    tgUser.LastName,
			SessionData: encryptedSession,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	// Clean up the auth transaction and promote temp client to active pool.
	uc.clientPool.PromoteTempClientToActive(transactionID, user.ID)

	// Clean up auth tx from DB
	if err := uc.authRepo.Delete(transactionID); err != nil {
		log.Printf("warning: failed to delete auth transaction %s: %v", transactionID, err)
	}

	// Generate JWT token.
	token, err := uc.generateJWT(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate JWT: %w", err)
	}

	return &SignInResult{
		Token: token,
		User:  user,
	}, nil
}

// generateJWT creates a signed JWT token for the given user ID with a 7-day expiry.
func (uc *AuthUsecase) generateJWT(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(uc.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT: %w", err)
	}
	return signedToken, nil
}

// UpdateProfile updates the authenticated user's profile details.
func (uc *AuthUsecase) UpdateProfile(userID int, firstName, lastName, phone, photoURL string) (*domain.User, error) {
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	user.FirstName = firstName
	user.LastName = lastName
	user.Phone = phone
	user.PhotoURL = photoURL

	if err := uc.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}
