package usecase

import (
	"context"
	"fmt"
	"io"
	"mime"
	"path/filepath"

	"github.com/teledrive/teledrive/domain"
	tginfra "github.com/teledrive/teledrive/infrastructure/telegram"
)

// StreamUsecase handles file upload and download streaming through Telegram.
type StreamUsecase struct {
	fileRepo   domain.FileRepository
	userRepo   domain.UserRepository
	clientPool *tginfra.ClientPool
	uploader   *tginfra.Uploader
	downloader *tginfra.Downloader
}

// NewStreamUsecase creates a new StreamUsecase.
func NewStreamUsecase(
	fileRepo domain.FileRepository,
	userRepo domain.UserRepository,
	clientPool *tginfra.ClientPool,
	uploader *tginfra.Uploader,
	downloader *tginfra.Downloader,
) *StreamUsecase {
	return &StreamUsecase{
		fileRepo:   fileRepo,
		userRepo:   userRepo,
		clientPool: clientPool,
		uploader:   uploader,
		downloader: downloader,
	}
}

// Upload uploads a file to Telegram and creates a file record in the database.
func (uc *StreamUsecase) Upload(
	ctx context.Context,
	userID int,
	folderID *int,
	fileName string,
	fileSize int64,
	reader io.Reader,
) (*domain.File, error) {
	// Get the user to access their session.
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Get a Telegram client from the pool.
	client, err := uc.clientPool.GetClient(userID, user.SessionData)
	if err != nil {
		return nil, fmt.Errorf("failed to get telegram client: %w", err)
	}

	// Upload the file to Telegram.
	result, err := uc.uploader.UploadFile(ctx, client, reader, fileName, fileSize)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	// Detect MIME type from extension.
	mimeType := mime.TypeByExtension(filepath.Ext(fileName))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Create file record in DB.
	file := &domain.File{
		UserID:            userID,
		FolderID:          folderID,
		Name:              fileName,
		Size:              fileSize,
		MimeType:          mimeType,
		TelegramMessageID: result.MessageID,
		TelegramChatID:    result.ChatID,
		TelegramFileID:    result.FileID,
	}

	created, err := uc.fileRepo.Create(file)
	if err != nil {
		return nil, fmt.Errorf("failed to create file record: %w", err)
	}

	return created, nil
}

// DownloadResult contains metadata for a file download.
type DownloadResult struct {
	FileName string
	MimeType string
	FileSize int64
}

// Download streams a file from Telegram to the provided writer.
func (uc *StreamUsecase) Download(
	ctx context.Context,
	userID int,
	fileID int,
	writer io.Writer,
) (*DownloadResult, error) {
	// Get the file record.
	file, err := uc.fileRepo.GetByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}
	if file.UserID != userID {
		return nil, fmt.Errorf("file does not belong to user")
	}

	// Get the user to access their session.
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Get a Telegram client from the pool.
	client, err := uc.clientPool.GetClient(userID, user.SessionData)
	if err != nil {
		return nil, fmt.Errorf("failed to get telegram client: %w", err)
	}

	// Download the file from Telegram.
	err = uc.downloader.DownloadFile(ctx, client, file.TelegramMessageID, file.TelegramChatID, writer)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return &DownloadResult{
		FileName: file.Name,
		MimeType: file.MimeType,
		FileSize: file.Size,
	}, nil
}
