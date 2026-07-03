package usecase

import (
	"context"
	"fmt"
	"log"

	"github.com/gotd/td/tg"
	"github.com/teledrive/teledrive/domain"
	tginfra "github.com/teledrive/teledrive/infrastructure/telegram"
)

// VFSUsecase handles virtual file system operations including folder/file CRUD and trash.
type VFSUsecase struct {
	folderRepo domain.FolderRepository
	fileRepo   domain.FileRepository
	clientPool *tginfra.ClientPool
}

// NewVFSUsecase creates a new VFSUsecase.
func NewVFSUsecase(folderRepo domain.FolderRepository, fileRepo domain.FileRepository, clientPool *tginfra.ClientPool) *VFSUsecase {
	return &VFSUsecase{
		folderRepo: folderRepo,
		fileRepo:   fileRepo,
		clientPool: clientPool,
	}
}

// DirectoryListing contains the folders and files in a directory.
type DirectoryListing struct {
	Folders []domain.Folder `json:"folders"`
	Files   []domain.File   `json:"files"`
}

// ListDirectory returns all non-deleted folders and files under the given parent.
func (uc *VFSUsecase) ListDirectory(userID int, folderID *int) (*DirectoryListing, error) {
	folders, err := uc.folderRepo.ListByParent(userID, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to list folders: %w", err)
	}

	files, err := uc.fileRepo.ListByFolder(userID, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	return &DirectoryListing{
		Folders: folders,
		Files:   files,
	}, nil
}

// CreateFolder creates a new folder under the given parent.
func (uc *VFSUsecase) CreateFolder(userID int, name string, parentID *int) (*domain.Folder, error) {
	if name == "" {
		return nil, fmt.Errorf("folder name is required")
	}

	// If parentID is provided, verify it exists and belongs to the user.
	if parentID != nil {
		parent, err := uc.folderRepo.GetByID(*parentID)
		if err != nil {
			return nil, fmt.Errorf("parent folder not found: %w", err)
		}
		if parent.UserID != userID {
			return nil, fmt.Errorf("parent folder does not belong to user")
		}
	}

	folder := &domain.Folder{
		UserID:   userID,
		Name:     name,
		ParentID: parentID,
	}

	created, err := uc.folderRepo.Create(folder)
	if err != nil {
		return nil, fmt.Errorf("failed to create folder: %w", err)
	}
	return created, nil
}

// RenameFolder renames a folder.
func (uc *VFSUsecase) RenameFolder(userID int, folderID int, newName string) (*domain.Folder, error) {
	if newName == "" {
		return nil, fmt.Errorf("new name is required")
	}

	folder, err := uc.folderRepo.GetByID(folderID)
	if err != nil {
		return nil, fmt.Errorf("folder not found: %w", err)
	}
	if folder.UserID != userID {
		return nil, fmt.Errorf("folder does not belong to user")
	}

	folder.Name = newName
	if err := uc.folderRepo.Update(folder); err != nil {
		return nil, fmt.Errorf("failed to rename folder: %w", err)
	}
	return folder, nil
}

// RenameFile renames a file.
func (uc *VFSUsecase) RenameFile(userID int, fileID int, newName string) (*domain.File, error) {
	if newName == "" {
		return nil, fmt.Errorf("new name is required")
	}

	file, err := uc.fileRepo.GetByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}
	if file.UserID != userID {
		return nil, fmt.Errorf("file does not belong to user")
	}

	file.Name = newName
	if err := uc.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to rename file: %w", err)
	}
	return file, nil
}

// MoveFolder moves a folder to a new parent.
func (uc *VFSUsecase) MoveFolder(userID int, folderID int, newParentID *int) (*domain.Folder, error) {
	folder, err := uc.folderRepo.GetByID(folderID)
	if err != nil {
		return nil, fmt.Errorf("folder not found: %w", err)
	}
	if folder.UserID != userID {
		return nil, fmt.Errorf("folder does not belong to user")
	}

	// Prevent moving a folder into itself.
	if newParentID != nil && *newParentID == folderID {
		return nil, fmt.Errorf("cannot move folder into itself")
	}

	// If newParentID is provided, verify it exists and belongs to the user.
	if newParentID != nil {
		parent, err := uc.folderRepo.GetByID(*newParentID)
		if err != nil {
			return nil, fmt.Errorf("target parent folder not found: %w", err)
		}
		if parent.UserID != userID {
			return nil, fmt.Errorf("target parent folder does not belong to user")
		}
	}

	folder.ParentID = newParentID
	if err := uc.folderRepo.Update(folder); err != nil {
		return nil, fmt.Errorf("failed to move folder: %w", err)
	}
	return folder, nil
}

// MoveFile moves a file to a new folder.
func (uc *VFSUsecase) MoveFile(userID int, fileID int, newFolderID *int) (*domain.File, error) {
	file, err := uc.fileRepo.GetByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}
	if file.UserID != userID {
		return nil, fmt.Errorf("file does not belong to user")
	}

	// If newFolderID is provided, verify it exists and belongs to the user.
	if newFolderID != nil {
		folder, err := uc.folderRepo.GetByID(*newFolderID)
		if err != nil {
			return nil, fmt.Errorf("target folder not found: %w", err)
		}
		if folder.UserID != userID {
			return nil, fmt.Errorf("target folder does not belong to user")
		}
	}

	file.FolderID = newFolderID
	if err := uc.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to move file: %w", err)
	}
	return file, nil
}

// DeleteFolder soft-deletes a folder.
func (uc *VFSUsecase) DeleteFolder(userID int, folderID int) error {
	folder, err := uc.folderRepo.GetByID(folderID)
	if err != nil {
		return fmt.Errorf("folder not found: %w", err)
	}
	if folder.UserID != userID {
		return fmt.Errorf("folder does not belong to user")
	}

	if err := uc.folderRepo.SoftDelete(folderID); err != nil {
		return fmt.Errorf("failed to delete folder: %w", err)
	}
	return nil
}

// DeleteFile soft-deletes a file.
func (uc *VFSUsecase) DeleteFile(userID int, fileID int) error {
	file, err := uc.fileRepo.GetByID(fileID)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}
	if file.UserID != userID {
		return fmt.Errorf("file does not belong to user")
	}

	if err := uc.fileRepo.SoftDelete(fileID); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// TrashListing contains soft-deleted folders and files.
type TrashListing struct {
	Folders []domain.Folder `json:"folders"`
	Files   []domain.File   `json:"files"`
}

// ListTrash returns all trashed folders and files for a user.
func (uc *VFSUsecase) ListTrash(userID int) (*TrashListing, error) {
	folders, err := uc.folderRepo.ListTrashed(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list trashed folders: %w", err)
	}

	files, err := uc.fileRepo.ListTrashed(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list trashed files: %w", err)
	}

	return &TrashListing{
		Folders: folders,
		Files:   files,
	}, nil
}

// RestoreFolder restores a soft-deleted folder.
func (uc *VFSUsecase) RestoreFolder(userID int, folderID int) error {
	folder, err := uc.folderRepo.GetByID(folderID)
	if err != nil {
		return fmt.Errorf("folder not found: %w", err)
	}
	if folder.UserID != userID {
		return fmt.Errorf("folder does not belong to user")
	}

	if err := uc.folderRepo.Restore(folderID); err != nil {
		return fmt.Errorf("failed to restore folder: %w", err)
	}
	return nil
}

// RestoreFile restores a soft-deleted file.
func (uc *VFSUsecase) RestoreFile(userID int, fileID int) error {
	file, err := uc.fileRepo.GetByID(fileID)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}
	if file.UserID != userID {
		return fmt.Errorf("file does not belong to user")
	}

	if err := uc.fileRepo.Restore(fileID); err != nil {
		return fmt.Errorf("failed to restore file: %w", err)
	}
	return nil
}

// EmptyTrash permanently deletes all trashed folders and files for a user.
func (uc *VFSUsecase) EmptyTrash(userID int) error {
	// Retrieve all trashed files first
	trashedFiles, err := uc.fileRepo.ListTrashed(userID)
	if err != nil {
		return fmt.Errorf("failed to list trashed files: %w", err)
	}

	// Group message IDs to delete from Telegram
	var messageIDs []int
	for _, file := range trashedFiles {
		if file.TelegramMessageID != 0 {
			messageIDs = append(messageIDs, file.TelegramMessageID)
		}
	}

	if len(messageIDs) > 0 {
		client, err := uc.clientPool.GetClient(userID, "")
		if err == nil {
			api := client.API()
			// Telegram API allows deleting up to 100 messages at once
			chunkSize := 100
			for i := 0; i < len(messageIDs); i += chunkSize {
				end := i + chunkSize
				if end > len(messageIDs) {
					end = len(messageIDs)
				}
				chunk := messageIDs[i:end]
				_, err = api.MessagesDeleteMessages(context.Background(), &tg.MessagesDeleteMessagesRequest{
					Revoke: true, // Delete for everyone
					ID:     chunk,
				})
				if err != nil {
					log.Printf("Failed to delete messages %v from Telegram: %v", chunk, err)
				}
			}
		} else {
			log.Printf("Failed to get Telegram client for user %d to delete messages: %v", userID, err)
		}
	}

	// Delete all trashed files from the database
	if err := uc.fileRepo.PermanentDeleteAllTrashed(userID); err != nil {
		return fmt.Errorf("failed to empty trashed files: %w", err)
	}

	// Delete all trashed folders.
	trashedFolders, err := uc.folderRepo.ListTrashed(userID)
	if err != nil {
		return fmt.Errorf("failed to list trashed folders: %w", err)
	}
	for _, folder := range trashedFolders {
		if err := uc.folderRepo.PermanentDelete(folder.ID); err != nil {
			return fmt.Errorf("failed to permanently delete folder %d: %w", folder.ID, err)
		}
	}

	return nil
}

// GetBreadcrumb returns the breadcrumb trail from root to the given folder.
func (uc *VFSUsecase) GetBreadcrumb(userID int, folderID int) ([]domain.BreadcrumbItem, error) {
	items, err := uc.folderRepo.GetBreadcrumb(folderID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get breadcrumb: %w", err)
	}
	return items, nil
}

// ListStarred returns all non-deleted starred folders and files for a user.
func (uc *VFSUsecase) ListStarred(userID int) (*DirectoryListing, error) {
	folders, err := uc.folderRepo.ListStarred(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list starred folders: %w", err)
	}

	files, err := uc.fileRepo.ListStarred(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list starred files: %w", err)
	}

	return &DirectoryListing{
		Folders: folders,
		Files:   files,
	}, nil
}



// ToggleStar toggles the starred status of a folder or file.
func (uc *VFSUsecase) ToggleStar(userID int, itemType string, itemID int) error {
	if itemType == "folder" {
		folder, err := uc.folderRepo.GetByID(itemID)
		if err != nil {
			return fmt.Errorf("folder not found: %w", err)
		}
		if folder.UserID != userID {
			return fmt.Errorf("permission denied")
		}
		folder.IsStarred = !folder.IsStarred
		return uc.folderRepo.Update(folder)
	} else if itemType == "file" {
		file, err := uc.fileRepo.GetByID(itemID)
		if err != nil {
			return fmt.Errorf("file not found: %w", err)
		}
		if file.UserID != userID {
			return fmt.Errorf("permission denied")
		}
		file.IsStarred = !file.IsStarred
		return uc.fileRepo.Update(file)
	}
	return fmt.Errorf("invalid item type: %s", itemType)
}


