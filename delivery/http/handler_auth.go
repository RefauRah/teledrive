package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/teledrive/teledrive/usecase"
)

// AuthHandler handles authentication-related HTTP requests.
type AuthHandler struct {
	authUsecase *usecase.AuthUsecase
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authUsecase *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase}
}

// sendCodeRequest is the JSON body for the send-code endpoint.
type sendCodeRequest struct {
	Phone string `json:"phone"`
}

// HandleSendCode handles POST /api/auth/send-code.
// It initiates the Telegram authentication flow by sending a verification code.
func (h *AuthHandler) HandleSendCode(c *fiber.Ctx) error {
	var req sendCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "phone number is required",
		})
	}

	result, err := h.authUsecase.SendCode(req.Phone)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"transaction_id": result.TransactionID,
	})
}

// signInRequest is the JSON body for the sign-in endpoint.
type signInRequest struct {
	TransactionID string `json:"transaction_id"`
	Code          string `json:"code"`
	Password      string `json:"password,omitempty"`
}

// HandleSignIn handles POST /api/auth/sign-in.
// It completes the authentication flow using the verification code.
func (h *AuthHandler) HandleSignIn(c *fiber.Ctx) error {
	var req signInRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.TransactionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "transaction_id is required",
		})
	}
	if req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "code is required",
		})
	}

	result, err := h.authUsecase.SignIn(req.TransactionID, req.Code, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token": result.Token,
		"user":  result.User,
	})
}

// updateProfileRequest is the JSON body for the update-profile endpoint.
type updateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	PhotoURL  string `json:"photo_url"`
}

// HandleUpdateProfile handles PUT /api/auth/profile.
func (h *AuthHandler) HandleUpdateProfile(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.FirstName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "first_name is required",
		})
	}

	user, err := h.authUsecase.UpdateProfile(userID, req.FirstName, req.LastName, req.Phone, req.PhotoURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(user)
}
