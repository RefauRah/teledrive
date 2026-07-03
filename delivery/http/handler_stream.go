package http

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/teledrive/teledrive/usecase"
)

const maxUploadSize = 2 * 1024 * 1024 * 1024 // 2GB

// StreamHandler handles file upload and download HTTP requests.
type StreamHandler struct {
	streamUsecase *usecase.StreamUsecase
}

// NewStreamHandler creates a new StreamHandler.
func NewStreamHandler(streamUsecase *usecase.StreamUsecase) *StreamHandler {
	return &StreamHandler{streamUsecase: streamUsecase}
}

// HandleUpload handles POST /api/vfs/upload.
// It reads the file from the request body stream and uploads it to Telegram.
func (h *StreamHandler) HandleUpload(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// Get file metadata from headers/query.
	fileName := c.Get("X-File-Name")
	if fileName == "" {
		fileName = c.Query("filename", "unnamed_file")
	}

	fileSizeStr := c.Get("Content-Length")
	if fileSizeStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Content-Length header is required"})
	}

	fileSize, err := strconv.ParseInt(fileSizeStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid Content-Length"})
	}

	// Validate file size.
	if fileSize > maxUploadSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("file size exceeds maximum allowed size of %d bytes", maxUploadSize),
		})
	}
	if fileSize <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file size must be greater than 0"})
	}

	// Parse optional folder_id.
	var folderID *int
	if folderIDStr := c.Query("folder_id"); folderIDStr != "" {
		id, err := strconv.Atoi(folderIDStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder_id"})
		}
		folderID = &id
	}

	// Read from the request body stream.
	reader := c.Request().BodyStream()
	if reader == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body is empty"})
	}

	file, err := h.streamUsecase.Upload(c.Context(), userID, folderID, fileName, fileSize, reader)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(file)
}

// HandleDownload handles GET /api/vfs/download/:id.
// It streams the file from Telegram to the HTTP response.
func (h *StreamHandler) HandleDownload(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	fileID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid file id"})
	}

	// We need to get the file metadata first to set headers before streaming.
	// Use the usecase's Download which will write to the response writer.
	writer := c.Response().BodyWriter()

	result, err := h.streamUsecase.Download(c.Context(), userID, fileID, writer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Set response headers.
	c.Set("Content-Type", result.MimeType)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.FileName))
	if result.FileSize > 0 {
		c.Set("Content-Length", strconv.FormatInt(result.FileSize, 10))
	}

	return nil
}
