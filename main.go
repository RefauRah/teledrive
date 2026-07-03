package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpdelivery "github.com/teledrive/teledrive/delivery/http"
	"github.com/teledrive/teledrive/infrastructure/config"
	"github.com/teledrive/teledrive/infrastructure/db"
	"github.com/teledrive/teledrive/infrastructure/telegram"
	"github.com/teledrive/teledrive/repository"
	"github.com/teledrive/teledrive/usecase"
)

func main() {
	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Connect to database
	log.Printf("Connecting to database...")
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() {
		log.Printf("Closing database connection...")
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// 3. Run database migrations
	log.Printf("Running migrations...")
	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	// 4. Initialize Telegram client pool
	log.Printf("Initializing Telegram client pool...")
	clientPool := telegram.NewClientPool(cfg.TelegramAPIID, cfg.TelegramAPIHash, database, cfg.EncryptionKey)
	defer func() {
		log.Printf("Closing Telegram client pool...")
		clientPool.Close()
	}()

	// 5. Initialize Repositories
	userRepo := repository.NewPostgresUserRepository(database)
	folderRepo := repository.NewPostgresFolderRepository(database)
	fileRepo := repository.NewPostgresFileRepository(database)
	authRepo := repository.NewPostgresAuthRepository(database)

	// 6. Initialize Usecases
	authUC := usecase.NewAuthUsecase(authRepo, userRepo, cfg, clientPool)
	vfsUC := usecase.NewVFSUsecase(folderRepo, fileRepo, clientPool)

	uploader := telegram.NewUploader()
	downloader := telegram.NewDownloader()
	streamUC := usecase.NewStreamUsecase(fileRepo, userRepo, clientPool, uploader, downloader)

	// 7. Setup HTTP Router & Initialize Fiber app
	app := httpdelivery.SetupRouter(cfg.JWTSecret, authUC, vfsUC, streamUC)

	// 9. Start server in a goroutine
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, syscall.SIGINT, syscall.SIGTERM)

	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	go func() {
		log.Printf("Server starting on %s...", serverAddr)
		if err := app.Listen(serverAddr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to listen: %v", err)
		}
	}()

	// 10. Wait for shutdown signal
	sig := <-shutdownChan
	log.Printf("Received signal %v. Initiating graceful shutdown...", sig)

	// Context for server shutdown with 15 seconds timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	} else {
		log.Println("Server stopped gracefully.")
	}
}
