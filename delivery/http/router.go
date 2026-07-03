package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/teledrive/teledrive/usecase"
)

// SetupRouter creates and configures the Fiber application with all routes.
func SetupRouter(
	jwtSecret string,
	authUsecase *usecase.AuthUsecase,
	vfsUsecase *usecase.VFSUsecase,
	streamUsecase *usecase.StreamUsecase,
) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler:          ErrorHandler,
		BodyLimit:             2 * 1024 * 1024 * 1024, // 2GB for file uploads
		StreamRequestBody:     true,
		DisableStartupMessage: false,
	})

	// Global middleware.
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-File-Name",
		AllowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	}))

	// Create handlers.
	authHandler := NewAuthHandler(authUsecase)
	vfsHandler := NewVFSHandler(vfsUsecase)
	streamHandler := NewStreamHandler(streamUsecase)

	// API routes.
	api := app.Group("/api")

	// Auth routes (no JWT required).
	auth := api.Group("/auth")
	auth.Post("/send-code", authHandler.HandleSendCode)
	auth.Post("/sign-in", authHandler.HandleSignIn)

	// Auth routes (JWT required).
	authAuth := api.Group("/auth", JWTMiddleware(jwtSecret))
	authAuth.Put("/profile", authHandler.HandleUpdateProfile)

	// VFS routes (JWT required).
	vfs := api.Group("/vfs", JWTMiddleware(jwtSecret))
	vfs.Get("/list", vfsHandler.HandleListDirectory)
	vfs.Post("/folders", vfsHandler.HandleCreateFolder)
	vfs.Patch("/folders/:id/rename", vfsHandler.HandleRenameFolder)
	vfs.Patch("/folders/:id/move", vfsHandler.HandleMoveFolder)
	vfs.Delete("/folders/:id", vfsHandler.HandleDeleteFolder)
	vfs.Patch("/files/:id/rename", vfsHandler.HandleRenameFile)
	vfs.Patch("/files/:id/move", vfsHandler.HandleMoveFile)
	vfs.Delete("/files/:id", vfsHandler.HandleDeleteFile)
	vfs.Get("/trash", vfsHandler.HandleListTrash)
	vfs.Post("/restore/:type/:id", vfsHandler.HandleRestore)
	vfs.Delete("/trash", vfsHandler.HandleEmptyTrash)
	vfs.Get("/breadcrumb", vfsHandler.HandleGetBreadcrumb)
	vfs.Get("/starred", vfsHandler.HandleListStarred)
	vfs.Patch("/starred/:type/:id", vfsHandler.HandleToggleStar)
	vfs.Post("/upload", streamHandler.HandleUpload)
	vfs.Get("/download/:id", streamHandler.HandleDownload)

	// Serve static files from frontend/dist in production.
	app.Static("/", "./frontend/dist")

	// Catch-all for SPA routing: serve index.html for unmatched routes.
	app.Get("/*", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/dist/index.html")
	})

	return app
}
