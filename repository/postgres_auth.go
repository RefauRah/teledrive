package repository

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/teledrive/teledrive/domain"
)

// PostgresAuthRepository implements domain.AuthRepository using PostgreSQL.
type PostgresAuthRepository struct {
	db *sqlx.DB
}

// NewPostgresAuthRepository creates a new PostgresAuthRepository.
func NewPostgresAuthRepository(db *sqlx.DB) *PostgresAuthRepository {
	return &PostgresAuthRepository{db: db}
}

// Create inserts a new auth transaction record.
func (r *PostgresAuthRepository) Create(tx *domain.AuthTransaction) error {
	_, err := r.db.Exec(
		"INSERT INTO auth_transactions (id, phone, phone_code_hash, created_at) VALUES ($1, $2, $3, NOW())",
		tx.ID, tx.Phone, tx.PhoneCodeHash,
	)
	if err != nil {
		return fmt.Errorf("failed to create auth transaction: %w", err)
	}
	return nil
}

// GetByID retrieves an auth transaction by its UUID.
func (r *PostgresAuthRepository) GetByID(id string) (*domain.AuthTransaction, error) {
	var tx domain.AuthTransaction
	err := r.db.Get(&tx, "SELECT * FROM auth_transactions WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("auth transaction not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get auth transaction: %w", err)
	}
	return &tx, nil
}

// Delete removes an auth transaction by its UUID.
func (r *PostgresAuthRepository) Delete(id string) error {
	_, err := r.db.Exec("DELETE FROM auth_transactions WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete auth transaction: %w", err)
	}
	return nil
}
