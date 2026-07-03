package repository

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/teledrive/teledrive/domain"
)

// PostgresUserRepository implements domain.UserRepository using PostgreSQL.
type PostgresUserRepository struct {
	db *sqlx.DB
}

// NewPostgresUserRepository creates a new PostgresUserRepository.
func NewPostgresUserRepository(db *sqlx.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

// Create inserts a new user record and returns the created user with its generated ID.
func (r *PostgresUserRepository) Create(user *domain.User) (*domain.User, error) {
	query := `
		INSERT INTO users (telegram_id, phone, username, first_name, last_name, photo_url, session_data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, telegram_id, phone, username, first_name, last_name, photo_url, session_data, created_at, updated_at`

	var created domain.User
	err := r.db.QueryRowx(query,
		user.TelegramID,
		user.Phone,
		user.Username,
		user.FirstName,
		user.LastName,
		user.PhotoURL,
		user.SessionData,
	).StructScan(&created)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return &created, nil
}

// GetByID retrieves a user by their internal ID.
func (r *PostgresUserRepository) GetByID(id int) (*domain.User, error) {
	var user domain.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}
	return &user, nil
}

// GetByTelegramID retrieves a user by their Telegram user ID.
func (r *PostgresUserRepository) GetByTelegramID(telegramID int64) (*domain.User, error) {
	var user domain.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE telegram_id = $1", telegramID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by telegram_id: %w", err)
	}
	return &user, nil
}

// GetByPhone retrieves a user by their phone number.
func (r *PostgresUserRepository) GetByPhone(phone string) (*domain.User, error) {
	var user domain.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE phone = $1", phone)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by phone: %w", err)
	}
	return &user, nil
}

// UpdateSession updates the encrypted session data for a given user.
func (r *PostgresUserRepository) UpdateSession(userID int, sessionData string) error {
	_, err := r.db.Exec(
		"UPDATE users SET session_data = $1, updated_at = NOW() WHERE id = $2",
		sessionData, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}
	return nil
}

// Update updates user profile details.
func (r *PostgresUserRepository) Update(user *domain.User) error {
	query := `
		UPDATE users 
		SET first_name = $1, last_name = $2, phone = $3, photo_url = $4, updated_at = NOW()
		WHERE id = $5`
	_, err := r.db.Exec(query, user.FirstName, user.LastName, user.Phone, user.PhotoURL, user.ID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}
