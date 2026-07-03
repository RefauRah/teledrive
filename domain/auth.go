package domain

import "time"

// AuthTransaction represents a pending phone code authentication flow.
type AuthTransaction struct {
	ID            string    `db:"id" json:"id"`
	Phone         string    `db:"phone" json:"phone"`
	PhoneCodeHash string    `db:"phone_code_hash" json:"phone_code_hash"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// AuthRepository defines the interface for auth transaction persistence.
type AuthRepository interface {
	// Create inserts a new auth transaction record.
	Create(tx *AuthTransaction) error

	// GetByID retrieves an auth transaction by its UUID.
	GetByID(id string) (*AuthTransaction, error)

	// Delete removes an auth transaction by its UUID.
	Delete(id string) error
}
