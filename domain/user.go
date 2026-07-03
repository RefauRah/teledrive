package domain

import "time"

// User represents a registered Telegram user in the system.
type User struct {
	ID          int       `db:"id" json:"id"`
	TelegramID  int64     `db:"telegram_id" json:"telegram_id"`
	Phone       string    `db:"phone" json:"phone"`
	Username    string    `db:"username" json:"username"`
	FirstName   string    `db:"first_name" json:"first_name"`
	LastName    string    `db:"last_name" json:"last_name"`
	PhotoURL    string    `db:"photo_url" json:"photo_url"`
	SessionData string    `db:"session_data" json:"-"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// UserRepository defines the interface for user persistence operations.
type UserRepository interface {
	// Create inserts a new user record and returns the created user with its generated ID.
	Create(user *User) (*User, error)

	// GetByID retrieves a user by their internal ID.
	GetByID(id int) (*User, error)

	// GetByTelegramID retrieves a user by their Telegram user ID.
	GetByTelegramID(telegramID int64) (*User, error)

	// GetByPhone retrieves a user by their phone number.
	GetByPhone(phone string) (*User, error)

	// UpdateSession updates the encrypted session data for a given user.
	UpdateSession(userID int, sessionData string) error

	// Update updates user profile details.
	Update(user *User) error
}
