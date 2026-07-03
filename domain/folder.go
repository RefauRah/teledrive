package domain

import "time"

// Folder represents a virtual folder in the user's file system.
type Folder struct {
	ID        int        `db:"id" json:"id"`
	UserID    int        `db:"user_id" json:"user_id"`
	Name      string     `db:"name" json:"name"`
	ParentID  *int       `db:"parent_id" json:"parent_id"`
	IsStarred bool       `db:"is_starred" json:"is_starred"`
	DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

// BreadcrumbItem represents a single segment in a folder breadcrumb trail.
type BreadcrumbItem struct {
	ID   int    `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
}

// FolderRepository defines the interface for folder persistence operations.
type FolderRepository interface {
	// Create inserts a new folder record and returns the created folder.
	Create(folder *Folder) (*Folder, error)

	// GetByID retrieves a folder by its ID, regardless of soft-delete status.
	GetByID(id int) (*Folder, error)

	// ListByParent lists non-deleted folders for a user under a given parent (nil = root).
	ListByParent(userID int, parentID *int) ([]Folder, error)

	// Update updates the folder name and/or parent (rename/move).
	Update(folder *Folder) error

	// SoftDelete sets deleted_at on a folder.
	SoftDelete(id int) error

	// Restore clears deleted_at on a folder.
	Restore(id int) error

	// ListTrashed returns all soft-deleted folders for a user.
	ListTrashed(userID int) ([]Folder, error)

	// PermanentDelete removes a folder record permanently from the database.
	PermanentDelete(id int) error

	// GetBreadcrumb returns the breadcrumb path from the root to the specified folder
	// using a recursive CTE.
	GetBreadcrumb(folderID int, userID int) ([]BreadcrumbItem, error)

	// ListStarred lists all non-deleted starred folders for a user.
	ListStarred(userID int) ([]Folder, error)
}
