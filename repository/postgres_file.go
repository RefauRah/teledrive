package repository

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/teledrive/teledrive/domain"
)

// PostgresFileRepository implements domain.FileRepository using PostgreSQL.
type PostgresFileRepository struct {
	db *sqlx.DB
}

// NewPostgresFileRepository creates a new PostgresFileRepository.
func NewPostgresFileRepository(db *sqlx.DB) *PostgresFileRepository {
	return &PostgresFileRepository{db: db}
}

// Create inserts a new file record and returns the created file.
func (r *PostgresFileRepository) Create(file *domain.File) (*domain.File, error) {
	query := `
		INSERT INTO files (user_id, folder_id, name, size, mime_type, telegram_message_id, telegram_chat_id, telegram_file_id, is_starred, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
		RETURNING id, user_id, folder_id, name, size, mime_type, telegram_message_id, telegram_chat_id, telegram_file_id, is_starred, deleted_at, created_at, updated_at`

	var created domain.File
	err := r.db.QueryRowx(query,
		file.UserID,
		file.FolderID,
		file.Name,
		file.Size,
		file.MimeType,
		file.TelegramMessageID,
		file.TelegramChatID,
		file.TelegramFileID,
	).StructScan(&created)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	return &created, nil
}

// GetByID retrieves a file by its ID.
func (r *PostgresFileRepository) GetByID(id int) (*domain.File, error) {
	var file domain.File
	err := r.db.Get(&file, "SELECT * FROM files WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get file by id: %w", err)
	}
	return &file, nil
}

// ListByFolder lists non-deleted files for a user in a given folder (nil = root).
func (r *PostgresFileRepository) ListByFolder(userID int, folderID *int) ([]domain.File, error) {
	var files []domain.File
	var err error

	if folderID == nil {
		err = r.db.Select(&files,
			"SELECT * FROM files WHERE user_id = $1 AND folder_id IS NULL AND deleted_at IS NULL ORDER BY name",
			userID,
		)
	} else {
		err = r.db.Select(&files,
			"SELECT * FROM files WHERE user_id = $1 AND folder_id = $2 AND deleted_at IS NULL ORDER BY name",
			userID, *folderID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}
	if files == nil {
		files = []domain.File{}
	}
	return files, nil
}

// Update updates the file name, folder, and is_starred status.
func (r *PostgresFileRepository) Update(file *domain.File) error {
	_, err := r.db.Exec(
		"UPDATE files SET name = $1, folder_id = $2, is_starred = $3, updated_at = NOW() WHERE id = $4",
		file.Name, file.FolderID, file.IsStarred, file.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update file: %w", err)
	}
	return nil
}

// SoftDelete sets deleted_at on a file.
func (r *PostgresFileRepository) SoftDelete(id int) error {
	_, err := r.db.Exec("UPDATE files SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to soft delete file: %w", err)
	}
	return nil
}

// Restore clears deleted_at on a file.
func (r *PostgresFileRepository) Restore(id int) error {
	_, err := r.db.Exec("UPDATE files SET deleted_at = NULL, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to restore file: %w", err)
	}
	return nil
}

// ListTrashed returns all soft-deleted files for a user.
func (r *PostgresFileRepository) ListTrashed(userID int) ([]domain.File, error) {
	var files []domain.File
	err := r.db.Select(&files,
		"SELECT * FROM files WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list trashed files: %w", err)
	}
	if files == nil {
		files = []domain.File{}
	}
	return files, nil
}

// PermanentDelete removes a file record permanently from the database.
func (r *PostgresFileRepository) PermanentDelete(id int) error {
	_, err := r.db.Exec("DELETE FROM files WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete file: %w", err)
	}
	return nil
}

// PermanentDeleteAllTrashed permanently deletes all trashed files for a user.
func (r *PostgresFileRepository) PermanentDeleteAllTrashed(userID int) error {
	_, err := r.db.Exec("DELETE FROM files WHERE user_id = $1 AND deleted_at IS NOT NULL", userID)
	if err != nil {
		return fmt.Errorf("failed to permanently delete all trashed files: %w", err)
	}
	return nil
}

// ListStarred lists all non-deleted starred files for a user.
func (r *PostgresFileRepository) ListStarred(userID int) ([]domain.File, error) {
	var files []domain.File
	err := r.db.Select(&files,
		"SELECT * FROM files WHERE user_id = $1 AND is_starred = true AND deleted_at IS NULL ORDER BY name",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list starred files: %w", err)
	}
	if files == nil {
		files = []domain.File{}
	}
	return files, nil
}

