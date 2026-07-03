package repository

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/teledrive/teledrive/domain"
)

// PostgresFolderRepository implements domain.FolderRepository using PostgreSQL.
type PostgresFolderRepository struct {
	db *sqlx.DB
}

// NewPostgresFolderRepository creates a new PostgresFolderRepository.
func NewPostgresFolderRepository(db *sqlx.DB) *PostgresFolderRepository {
	return &PostgresFolderRepository{db: db}
}

// Create inserts a new folder record and returns the created folder.
func (r *PostgresFolderRepository) Create(folder *domain.Folder) (*domain.Folder, error) {
	query := `
		INSERT INTO folders (user_id, name, parent_id, is_starred, created_at, updated_at)
		VALUES ($1, $2, $3, false, NOW(), NOW())
		RETURNING id, user_id, name, parent_id, is_starred, deleted_at, created_at, updated_at`

	var created domain.Folder
	err := r.db.QueryRowx(query,
		folder.UserID,
		folder.Name,
		folder.ParentID,
	).StructScan(&created)
	if err != nil {
		return nil, fmt.Errorf("failed to create folder: %w", err)
	}
	return &created, nil
}

// GetByID retrieves a folder by its ID, regardless of soft-delete status.
func (r *PostgresFolderRepository) GetByID(id int) (*domain.Folder, error) {
	var folder domain.Folder
	err := r.db.Get(&folder, "SELECT * FROM folders WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("folder not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get folder by id: %w", err)
	}
	return &folder, nil
}

// ListByParent lists non-deleted folders for a user under a given parent (nil = root).
func (r *PostgresFolderRepository) ListByParent(userID int, parentID *int) ([]domain.Folder, error) {
	var folders []domain.Folder
	var err error

	if parentID == nil {
		err = r.db.Select(&folders,
			"SELECT * FROM folders WHERE user_id = $1 AND parent_id IS NULL AND deleted_at IS NULL ORDER BY name",
			userID,
		)
	} else {
		err = r.db.Select(&folders,
			"SELECT * FROM folders WHERE user_id = $1 AND parent_id = $2 AND deleted_at IS NULL ORDER BY name",
			userID, *parentID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list folders: %w", err)
	}
	if folders == nil {
		folders = []domain.Folder{}
	}
	return folders, nil
}

// Update updates the folder name, parent, and is_starred status.
func (r *PostgresFolderRepository) Update(folder *domain.Folder) error {
	_, err := r.db.Exec(
		"UPDATE folders SET name = $1, parent_id = $2, is_starred = $3, updated_at = NOW() WHERE id = $4",
		folder.Name, folder.ParentID, folder.IsStarred, folder.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update folder: %w", err)
	}
	return nil
}

// SoftDelete sets deleted_at on a folder.
func (r *PostgresFolderRepository) SoftDelete(id int) error {
	_, err := r.db.Exec("UPDATE folders SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to soft delete folder: %w", err)
	}
	return nil
}

// Restore clears deleted_at on a folder.
func (r *PostgresFolderRepository) Restore(id int) error {
	_, err := r.db.Exec("UPDATE folders SET deleted_at = NULL, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to restore folder: %w", err)
	}
	return nil
}

// ListTrashed returns all soft-deleted folders for a user.
func (r *PostgresFolderRepository) ListTrashed(userID int) ([]domain.Folder, error) {
	var folders []domain.Folder
	err := r.db.Select(&folders,
		"SELECT * FROM folders WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list trashed folders: %w", err)
	}
	if folders == nil {
		folders = []domain.Folder{}
	}
	return folders, nil
}

// PermanentDelete removes a folder record permanently from the database.
func (r *PostgresFolderRepository) PermanentDelete(id int) error {
	_, err := r.db.Exec("DELETE FROM folders WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete folder: %w", err)
	}
	return nil
}

// GetBreadcrumb returns the breadcrumb path from the root to the specified folder
// using a recursive CTE.
func (r *PostgresFolderRepository) GetBreadcrumb(folderID int, userID int) ([]domain.BreadcrumbItem, error) {
	query := `
		WITH RECURSIVE breadcrumb AS (
			SELECT id, name, parent_id FROM folders WHERE id = $1 AND user_id = $2
			UNION ALL
			SELECT f.id, f.name, f.parent_id FROM folders f JOIN breadcrumb b ON f.id = b.parent_id
		)
		SELECT id, name FROM breadcrumb ORDER BY id`

	var items []domain.BreadcrumbItem
	err := r.db.Select(&items, query, folderID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get breadcrumb: %w", err)
	}
	if items == nil {
		items = []domain.BreadcrumbItem{}
	}
	return items, nil
}

// ListStarred lists all non-deleted starred folders for a user.
func (r *PostgresFolderRepository) ListStarred(userID int) ([]domain.Folder, error) {
	var folders []domain.Folder
	err := r.db.Select(&folders,
		"SELECT * FROM folders WHERE user_id = $1 AND is_starred = true AND deleted_at IS NULL ORDER BY name",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list starred folders: %w", err)
	}
	if folders == nil {
		folders = []domain.Folder{}
	}
	return folders, nil
}

