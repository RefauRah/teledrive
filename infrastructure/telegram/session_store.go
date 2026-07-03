package telegram

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"sync"

	"github.com/jmoiron/sqlx"

	"github.com/gotd/td/session"
)

// SessionStore implements the gotd session.Storage interface using AES-256-GCM
// encryption for persistent storage and an in-memory fallback for initial auth.
type SessionStore struct {
	db            *sqlx.DB
	encryptionKey []byte
	userID        int

	// In-memory session storage for use before user record exists (during auth flow).
	mu        sync.RWMutex
	memBuffer []byte
}

// NewSessionStore creates a new SessionStore instance.
// If userID is 0, sessions are stored in memory only (for initial auth).
func NewSessionStore(db *sqlx.DB, encryptionKey []byte, userID int) *SessionStore {
	return &SessionStore{
		db:            db,
		encryptionKey: encryptionKey,
		userID:        userID,
	}
}

// StoreSession encrypts the session data and persists it.
func (s *SessionStore) StoreSession(_ context.Context, data []byte) error {
	if s.userID == 0 {
		// Store in memory during initial auth flow.
		s.mu.Lock()
		s.memBuffer = make([]byte, len(data))
		copy(s.memBuffer, data)
		s.mu.Unlock()
		return nil
	}

	encrypted, err := s.encrypt(data)
	if err != nil {
		return fmt.Errorf("failed to encrypt session: %w", err)
	}

	_, err = s.db.Exec(
		"UPDATE users SET session_data = $1, updated_at = NOW() WHERE id = $2",
		encrypted, s.userID,
	)
	if err != nil {
		return fmt.Errorf("failed to store session in database: %w", err)
	}
	return nil
}

// LoadSession loads and decrypts the session data.
func (s *SessionStore) LoadSession(_ context.Context) ([]byte, error) {
	if s.userID == 0 {
		s.mu.RLock()
		data := s.memBuffer
		s.mu.RUnlock()
		if data == nil {
			return nil, session.ErrNotFound
		}
		return data, nil
	}

	var encrypted string
	err := s.db.Get(&encrypted, "SELECT session_data FROM users WHERE id = $1", s.userID)
	if err != nil {
		return nil, fmt.Errorf("failed to load session from database: %w", err)
	}
	if encrypted == "" {
		return nil, session.ErrNotFound
	}

	data, err := s.decrypt(encrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt session: %w", err)
	}
	return data, nil
}

// GetEncryptedSession returns the current in-memory session as an encrypted string.
// Used after auth to persist the session into the user record.
func (s *SessionStore) GetEncryptedSession() (string, error) {
	s.mu.RLock()
	data := s.memBuffer
	s.mu.RUnlock()
	if data == nil {
		return "", errors.New("no in-memory session available")
	}
	return s.encrypt(data)
}

// encrypt encrypts plaintext bytes using AES-256-GCM and returns a base64-encoded string.
func (s *SessionStore) encrypt(plaintext []byte) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decodes a base64 string and decrypts it using AES-256-GCM.
func (s *SessionStore) decrypt(encoded string) ([]byte, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}
	return plaintext, nil
}
