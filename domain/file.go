package domain

import "time"

// File represents a file stored in Telegram and tracked in the virtual file system.
type File struct {
	ID                int        `db:"id" json:"id"`
	UserID            int        `db:"user_id" json:"user_id"`
	FolderID          *int       `db:"folder_id" json:"folder_id"`
	Name              string     `db:"name" json:"name"`
	Size              int64      `db:"size" json:"size"`
	MimeType          string     `db:"mime_type" json:"mime_type"`
	TelegramMessageID int        `db:"telegram_message_id" json:"telegram_message_id"`
	TelegramChatID    int64      `db:"telegram_chat_id" json:"telegram_chat_id"`
	TelegramFileID    string     `db:"telegram_file_id" json:"telegram_file_id"`
	IsStarred         bool       `db:"is_starred" json:"is_starred"`
	DeletedAt         *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}

// FileRepository defines the interface for file persistence operations.
type FileRepository interface {
	// Create inserts a new file record and returns the created file.
	Create(file *File) (*File, error)

	// GetByID retrieves a file by its ID.
	GetByID(id int) (*File, error)

	// ListByFolder lists non-deleted files for a user in a given folder (nil = root).
	ListByFolder(userID int, folderID *int) ([]File, error)

	// Update updates the file name and/or folder (rename/move).
	Update(file *File) error

	// SoftDelete sets deleted_at on a file.
	SoftDelete(id int) error

	// Restore clears deleted_at on a file.
	Restore(id int) error

	// ListTrashed returns all soft-deleted files for a user.
	ListTrashed(userID int) ([]File, error)

	// PermanentDelete removes a file record permanently from the database.
	PermanentDelete(id int) error

	// PermanentDeleteAllTrashed permanently deletes all trashed files for a user.
	PermanentDeleteAllTrashed(userID int) error

	// ListStarred lists all non-deleted starred files for a user.
	ListStarred(userID int) ([]File, error)
}
