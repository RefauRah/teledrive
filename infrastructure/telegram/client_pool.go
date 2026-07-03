package telegram

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
)

const (
	idleTimeout     = 10 * time.Minute
	cleanupInterval = 1 * time.Minute
	tempIdleTimeout = 5 * time.Minute
)

// poolEntry holds a cached Telegram client with metadata for idle management.
type poolEntry struct {
	client   *telegram.Client
	lastUsed time.Time
	cancel   context.CancelFunc
	mu       sync.Mutex
}

func (e *poolEntry) touch() {
	e.mu.Lock()
	e.lastUsed = time.Now()
	e.mu.Unlock()
}

func (e *poolEntry) idleSince() time.Time {
	e.mu.Lock()
	t := e.lastUsed
	e.mu.Unlock()
	return t
}

// tempPoolEntry holds a temporary Telegram client during the authentication flow.
type tempPoolEntry struct {
	client       *telegram.Client
	sessionStore *SessionStore
	cancel       context.CancelFunc
	createdAt    time.Time
}

// ClientPool manages cached gotd client connections keyed by user ID.
type ClientPool struct {
	apiID         int
	apiHash       string
	db            *sqlx.DB
	encryptionKey []byte

	clients     sync.Map // map[int]*poolEntry
	tempClients sync.Map // map[string]*tempPoolEntry

	stopOnce sync.Once
	stopCh   chan struct{}
}

// NewClientPool creates a new client pool and starts the idle cleanup goroutine.
func NewClientPool(apiID int, apiHash string, db *sqlx.DB, encryptionKey []byte) *ClientPool {
	pool := &ClientPool{
		apiID:         apiID,
		apiHash:       apiHash,
		db:            db,
		encryptionKey: encryptionKey,
		stopCh:        make(chan struct{}),
	}
	go pool.cleanupLoop()
	return pool
}

// GetClient returns a cached client for the user or creates a new one using the
// provided encrypted session data.
func (p *ClientPool) GetClient(userID int, sessionData string) (*telegram.Client, error) {
	// Check cache first.
	if val, ok := p.clients.Load(userID); ok {
		entry := val.(*poolEntry)
		entry.touch()
		return entry.client, nil
	}

	// Create a new client with the user's session.
	sessionStore := NewSessionStore(p.db, p.encryptionKey, userID)

	// If sessionData is provided but user already has DB data, the store will load from DB.
	// We only need sessionData for reference; the store uses DB directly for userID > 0.
	_ = sessionData

	opts := telegram.Options{
		SessionStorage: &session.StorageMemory{},
	}

	// Use database-backed session storage for persistent users.
	if userID > 0 {
		opts.SessionStorage = sessionStore
	}

	client := telegram.NewClient(p.apiID, p.apiHash, opts)

	ctx, cancel := context.WithCancel(context.Background())

	entry := &poolEntry{
		client:   client,
		lastUsed: time.Now(),
		cancel:   cancel,
	}

	// Start the client in the background.
	errCh := make(chan error, 1)
	connected := make(chan struct{})
	go func() {
		errCh <- client.Run(ctx, func(ctx context.Context) error {
			close(connected) // Notify that client is connected and ready
			// Client is connected and ready. Block until context is cancelled.
			<-ctx.Done()
			return ctx.Err()
		})
	}()

	// Wait for connection or timeout.
	select {
	case err := <-errCh:
		cancel()
		return nil, fmt.Errorf("failed to start telegram client for user %d: %w", userID, err)
	case <-connected:
		// Client connected successfully!
	case <-time.After(15 * time.Second):
		cancel()
		return nil, fmt.Errorf("connection to telegram timed out")
	}

	p.clients.Store(userID, entry)
	return client, nil
}

// StartTempClient starts a temporary client in the background and waits for connection.
func (p *ClientPool) StartTempClient(sessionStore *SessionStore) (*telegram.Client, context.Context, context.CancelFunc, error) {
	client := telegram.NewClient(p.apiID, p.apiHash, telegram.Options{
		SessionStorage: sessionStore,
	})
	ctx, cancel := context.WithCancel(context.Background())

	errCh := make(chan error, 1)
	connected := make(chan struct{})
	go func() {
		errCh <- client.Run(ctx, func(ctx context.Context) error {
			close(connected) // Notify that client is connected and ready
			// Client is connected and ready. Block until context is cancelled.
			<-ctx.Done()
			return ctx.Err()
		})
	}()

	// Wait for connection or timeout.
	select {
	case err := <-errCh:
		cancel()
		return nil, nil, nil, fmt.Errorf("failed to start temp client: %w", err)
	case <-connected:
		// Temporary client connected successfully!
		return client, ctx, cancel, nil
	case <-time.After(25 * time.Second):
		cancel()
		return nil, nil, nil, fmt.Errorf("connection to telegram timed out")
	}
}

// RegisterTempClient caches a running temporary client.
func (p *ClientPool) RegisterTempClient(txID string, client *telegram.Client, sessionStore *SessionStore, cancel context.CancelFunc) {
	p.tempClients.Store(txID, &tempPoolEntry{
		client:       client,
		sessionStore: sessionStore,
		cancel:       cancel,
		createdAt:    time.Now(),
	})
}

// GetTempClient retrieves a cached temporary client.
func (p *ClientPool) GetTempClient(txID string) (*telegram.Client, *SessionStore, bool) {
	if val, ok := p.tempClients.Load(txID); ok {
		entry := val.(*tempPoolEntry)
		return entry.client, entry.sessionStore, true
	}
	return nil, nil, false
}

// RemoveTempClient stops and removes a cached temporary client.
func (p *ClientPool) RemoveTempClient(txID string) {
	if val, ok := p.tempClients.LoadAndDelete(txID); ok {
		entry := val.(*tempPoolEntry)
		entry.cancel()
	}
}

// PromoteTempClientToActive converts a running temporary client into a logged-in active client.
func (p *ClientPool) PromoteTempClientToActive(txID string, userID int) bool {
	if val, ok := p.tempClients.LoadAndDelete(txID); ok {
		entry := val.(*tempPoolEntry)
		p.clients.Store(userID, &poolEntry{
			client:   entry.client,
			lastUsed: time.Now(),
			cancel:   entry.cancel,
		})
		return true
	}
	return false
}

// RemoveClient removes and shuts down a cached client.
func (p *ClientPool) RemoveClient(userID int) {
	if val, ok := p.clients.LoadAndDelete(userID); ok {
		entry := val.(*poolEntry)
		entry.cancel()
	}
}

// cleanupLoop periodically removes idle clients from the pool.
func (p *ClientPool) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			p.evictIdle()
		case <-p.stopCh:
			return
		}
	}
}

// evictIdle closes clients that have been idle longer than the timeout.
func (p *ClientPool) evictIdle() {
	now := time.Now()
	// Clean up active users
	p.clients.Range(func(key, value interface{}) bool {
		entry := value.(*poolEntry)
		if now.Sub(entry.idleSince()) > idleTimeout {
			userID := key.(int)
			log.Printf("evicting idle client for user %d", userID)
			p.clients.Delete(key)
			entry.cancel()
		}
		return true
	})

	// Clean up expired temp auth clients (older than 5 minutes)
	p.tempClients.Range(func(key, value interface{}) bool {
		entry := value.(*tempPoolEntry)
		if now.Sub(entry.createdAt) > tempIdleTimeout {
			txID := key.(string)
			log.Printf("evicting expired temp client for transaction %s", txID)
			p.tempClients.Delete(key)
			entry.cancel()
		}
		return true
	})
}

// Close shuts down all cached clients and stops the cleanup goroutine.
func (p *ClientPool) Close() {
	p.stopOnce.Do(func() {
		close(p.stopCh)
	})
	p.clients.Range(func(key, value interface{}) bool {
		entry := value.(*poolEntry)
		entry.cancel()
		p.clients.Delete(key)
		return true
	})
	p.tempClients.Range(func(key, value interface{}) bool {
		entry := value.(*tempPoolEntry)
		entry.cancel()
		p.tempClients.Delete(key)
		return true
	})
}
