package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/teledrive/teledrive/usecase"
)

// VFSHandler handles virtual file system HTTP requests.
type VFSHandler struct {
	vfsUsecase *usecase.VFSUsecase
}

// NewVFSHandler creates a new VFSHandler.
func NewVFSHandler(vfsUsecase *usecase.VFSUsecase) *VFSHandler {
	return &VFSHandler{vfsUsecase: vfsUsecase}
}

// HandleListDirectory handles GET /api/vfs/list.
func (h *VFSHandler) HandleListDirectory(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	var folderID *int
	if folderIDStr := c.Query("folder_id"); folderIDStr != "" {
		id, err := strconv.Atoi(folderIDStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder_id"})
		}
		folderID = &id
	}

	listing, err := h.vfsUsecase.ListDirectory(userID, folderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(listing)
}

// createFolderRequest is the JSON body for creating a folder.
type createFolderRequest struct {
	Name     string `json:"name"`
	ParentID *int   `json:"parent_id,omitempty"`
}

// HandleCreateFolder handles POST /api/vfs/folders.
func (h *VFSHandler) HandleCreateFolder(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	var req createFolderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	folder, err := h.vfsUsecase.CreateFolder(userID, req.Name, req.ParentID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(folder)
}

// renameRequest is the JSON body for rename operations.
type renameRequest struct {
	Name string `json:"name"`
}

// HandleRenameFolder handles PATCH /api/vfs/folders/:id/rename.
func (h *VFSHandler) HandleRenameFolder(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	folderID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder id"})
	}

	var req renameRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	folder, err := h.vfsUsecase.RenameFolder(userID, folderID, req.Name)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(folder)
}

// HandleRenameFile handles PATCH /api/vfs/files/:id/rename.
func (h *VFSHandler) HandleRenameFile(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	fileID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid file id"})
	}

	var req renameRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	file, err := h.vfsUsecase.RenameFile(userID, fileID, req.Name)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(file)
}

// moveRequest is the JSON body for move operations.
type moveRequest struct {
	ParentID *int `json:"parent_id"`
	FolderID *int `json:"folder_id"`
}

// HandleMoveFolder handles PATCH /api/vfs/folders/:id/move.
func (h *VFSHandler) HandleMoveFolder(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	folderID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder id"})
	}

	var req moveRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	folder, err := h.vfsUsecase.MoveFolder(userID, folderID, req.ParentID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(folder)
}

// HandleMoveFile handles PATCH /api/vfs/files/:id/move.
func (h *VFSHandler) HandleMoveFile(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	fileID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid file id"})
	}

	var req moveRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	file, err := h.vfsUsecase.MoveFile(userID, fileID, req.FolderID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(file)
}

// HandleDeleteFolder handles DELETE /api/vfs/folders/:id.
func (h *VFSHandler) HandleDeleteFolder(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	folderID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder id"})
	}

	if err := h.vfsUsecase.DeleteFolder(userID, folderID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "folder deleted"})
}

// HandleDeleteFile handles DELETE /api/vfs/files/:id.
func (h *VFSHandler) HandleDeleteFile(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	fileID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid file id"})
	}

	if err := h.vfsUsecase.DeleteFile(userID, fileID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "file deleted"})
}

// HandleListTrash handles GET /api/vfs/trash.
func (h *VFSHandler) HandleListTrash(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	listing, err := h.vfsUsecase.ListTrash(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(listing)
}

// HandleRestore handles POST /api/vfs/restore/:type/:id.
func (h *VFSHandler) HandleRestore(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	itemType := c.Params("type")
	itemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	switch itemType {
	case "folder":
		if err := h.vfsUsecase.RestoreFolder(userID, itemID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	case "file":
		if err := h.vfsUsecase.RestoreFile(userID, itemID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type must be 'folder' or 'file'"})
	}

	return c.JSON(fiber.Map{"message": itemType + " restored"})
}

// HandleEmptyTrash handles DELETE /api/vfs/trash.
func (h *VFSHandler) HandleEmptyTrash(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.vfsUsecase.EmptyTrash(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "trash emptied"})
}

// HandleGetBreadcrumb handles GET /api/vfs/breadcrumb.
func (h *VFSHandler) HandleGetBreadcrumb(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	folderIDStr := c.Query("folder_id")
	if folderIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "folder_id is required"})
	}

	folderID, err := strconv.Atoi(folderIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder_id"})
	}

	items, err := h.vfsUsecase.GetBreadcrumb(userID, folderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"breadcrumb": items})
}

// HandleListStarred handles GET /api/vfs/starred.
func (h *VFSHandler) HandleListStarred(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	listing, err := h.vfsUsecase.ListStarred(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(listing)
}


// HandleToggleStar handles PATCH /api/vfs/starred/:type/:id.
func (h *VFSHandler) HandleToggleStar(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	itemType := c.Params("type")
	itemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.vfsUsecase.ToggleStar(userID, itemType, itemID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "starred status updated"})
}

