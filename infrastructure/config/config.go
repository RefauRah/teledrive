package config

import (
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	TelegramAPIID   int
	TelegramAPIHash string
	DatabaseURL     string
	JWTSecret       string
	EncryptionKey   []byte
	AllowedPhones   []string
	Port            string
}

// Load reads configuration from environment variables, falling back to a .env file.
func Load() (*Config, error) {
	// Attempt to load .env file; ignore error if it doesn't exist.
	_ = godotenv.Load()

	apiIDStr := os.Getenv("TELEGRAM_API_ID")
	if apiIDStr == "" {
		return nil, fmt.Errorf("TELEGRAM_API_ID is required")
	}
	apiID, err := strconv.Atoi(apiIDStr)
	if err != nil {
		return nil, fmt.Errorf("TELEGRAM_API_ID must be an integer: %w", err)
	}

	apiHash := os.Getenv("TELEGRAM_API_HASH")
	if apiHash == "" {
		return nil, fmt.Errorf("TELEGRAM_API_HASH is required")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	encKeyHex := os.Getenv("ENCRYPTION_KEY")
	if encKeyHex == "" {
		return nil, fmt.Errorf("ENCRYPTION_KEY is required")
	}
	encKey, err := hex.DecodeString(encKeyHex)
	if err != nil {
		return nil, fmt.Errorf("ENCRYPTION_KEY must be valid hex: %w", err)
	}
	if len(encKey) != 32 {
		return nil, fmt.Errorf("ENCRYPTION_KEY must be 32 bytes (64 hex chars), got %d bytes", len(encKey))
	}

	var allowedPhones []string
	phonesStr := os.Getenv("ALLOWED_PHONES")
	if phonesStr != "" {
		for _, p := range strings.Split(phonesStr, ",") {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				allowedPhones = append(allowedPhones, trimmed)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		TelegramAPIID:   apiID,
		TelegramAPIHash: apiHash,
		DatabaseURL:     databaseURL,
		JWTSecret:       jwtSecret,
		EncryptionKey:   encKey,
		AllowedPhones:   allowedPhones,
		Port:            port,
	}, nil
}

// IsPhoneAllowed checks whether the given phone number is in the allowed whitelist.
// If the whitelist is empty, all phones are allowed.
func (c *Config) IsPhoneAllowed(phone string) bool {
	if len(c.AllowedPhones) == 0 {
		return true
	}
	for _, allowed := range c.AllowedPhones {
		if allowed == phone {
			return true
		}
	}
	return false
}
