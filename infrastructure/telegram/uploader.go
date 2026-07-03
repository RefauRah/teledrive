package telegram

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
)

const (
	chunkSize      = 512 * 1024 // 512KB per chunk
	bufferCapacity = 4          // buffered channel capacity
	workerCount    = 3          // concurrent upload workers
)

// UploadResult holds the result of a file upload operation.
type UploadResult struct {
	MessageID int
	ChatID    int64
	FileID    string
}

// chunkData represents a single upload chunk.
type chunkData struct {
	partIndex int
	data      []byte
}

// Uploader handles file uploads to Telegram using buffered concurrent chunking.
type Uploader struct{}

// NewUploader creates a new Uploader instance.
func NewUploader() *Uploader {
	return &Uploader{}
}

// UploadFile uploads a file to Telegram Saved Messages using concurrent chunked upload.
// It reads chunks of 512KB, sends them through a buffered channel, and uses 3 worker
// goroutines to call SaveBigFilePart concurrently.
func (u *Uploader) UploadFile(
	ctx context.Context,
	client *telegram.Client,
	reader io.Reader,
	fileName string,
	fileSize int64,
) (*UploadResult, error) {
	// Generate a random file_id for this upload.
	fileIDRand, err := rand.Int(rand.Reader, big.NewInt(1<<62))
	if err != nil {
		return nil, fmt.Errorf("failed to generate file id: %w", err)
	}
	fileID := fileIDRand.Int64()

	// Calculate total parts.
	totalParts := int((fileSize + chunkSize - 1) / chunkSize)
	if totalParts == 0 {
		totalParts = 1
	}

	// Create buffered channel for chunks.
	chunks := make(chan chunkData, bufferCapacity)
	var uploadErr error
	var errOnce sync.Once
	var wg sync.WaitGroup
	var partsUploaded int64

	api := client.API()

	// Start worker goroutines.
	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for chunk := range chunks {
				if err := u.uploadPart(ctx, api, fileID, chunk.partIndex, totalParts, chunk.data); err != nil {
					errOnce.Do(func() {
						uploadErr = err
					})
					return
				}
				atomic.AddInt64(&partsUploaded, 1)
			}
		}()
	}

	// Read file and send chunks to workers.
	partIndex := 0
	for {
		buf := make([]byte, chunkSize)
		n, readErr := io.ReadFull(reader, buf)
		if n > 0 {
			data := make([]byte, n)
			copy(data, buf[:n])
			select {
			case chunks <- chunkData{partIndex: partIndex, data: data}:
				partIndex++
			case <-ctx.Done():
				close(chunks)
				wg.Wait()
				return nil, ctx.Err()
			}
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) || errors.Is(readErr, io.ErrUnexpectedEOF) {
				break
			}
			close(chunks)
			wg.Wait()
			return nil, fmt.Errorf("failed to read file: %w", readErr)
		}
	}
	close(chunks)
	wg.Wait()

	if uploadErr != nil {
		return nil, fmt.Errorf("upload failed: %w", uploadErr)
	}

	// Send the uploaded file to Saved Messages as a document.
	inputFile := &tg.InputFileBig{
		ID:    fileID,
		Parts: totalParts,
		Name:  fileName,
	}

	media := &tg.InputMediaUploadedDocument{
		File:     inputFile,
		MimeType: "application/octet-stream",
		Attributes: []tg.DocumentAttributeClass{
			&tg.DocumentAttributeFilename{
				FileName: fileName,
			},
		},
	}

	// Send to Saved Messages (self).
	peer := &tg.InputPeerSelf{}

	var updates tg.UpdatesClass
	updates, err = u.sendMediaWithRetry(ctx, api, peer, media)
	if err != nil {
		return nil, fmt.Errorf("failed to send media to saved messages: %w", err)
	}

	// Extract message ID and chat ID from the response.
	result := &UploadResult{
		FileID: fmt.Sprintf("%d", fileID),
	}

	switch v := updates.(type) {
	case *tg.Updates:
		for _, update := range v.Updates {
			if msg, ok := update.(*tg.UpdateMessageID); ok {
				result.MessageID = msg.ID
			}
		}
		// Get chat ID from the first relevant update.
		for _, update := range v.Updates {
			switch upd := update.(type) {
			case *tg.UpdateNewMessage:
				if msg, ok := upd.Message.(*tg.Message); ok {
					result.MessageID = msg.ID
					if peer, ok := msg.PeerID.(*tg.PeerUser); ok {
						result.ChatID = peer.UserID
					}
				}
			}
		}
	case *tg.UpdateShortSentMessage:
		result.MessageID = v.ID
	}

	return result, nil
}

// uploadPart uploads a single file part with FLOOD_WAIT retry handling.
func (u *Uploader) uploadPart(ctx context.Context, api *tg.Client, fileID int64, partIndex, totalParts int, data []byte) error {
	maxRetries := 5
	for attempt := 0; attempt < maxRetries; attempt++ {
		_, err := api.UploadSaveBigFilePart(ctx, &tg.UploadSaveBigFilePartRequest{
			FileID:         fileID,
			FilePart:       partIndex,
			FileTotalParts: totalParts,
			Bytes:          data,
		})
		if err == nil {
			return nil
		}

		if waitErr := extractFloodWait(err); waitErr > 0 {
			log.Printf("FLOOD_WAIT: sleeping %v before retry (part %d, attempt %d)", waitErr, partIndex, attempt+1)
			select {
			case <-time.After(waitErr + time.Duration(attempt)*time.Second):
				continue
			case <-ctx.Done():
				return ctx.Err()
			}
		}

		return fmt.Errorf("failed to upload part %d: %w", partIndex, err)
	}
	return fmt.Errorf("exceeded max retries for part %d", partIndex)
}

// sendMediaWithRetry sends media with FLOOD_WAIT retry handling.
func (u *Uploader) sendMediaWithRetry(ctx context.Context, api *tg.Client, peer tg.InputPeerClass, media tg.InputMediaClass) (tg.UpdatesClass, error) {
	maxRetries := 5
	for attempt := 0; attempt < maxRetries; attempt++ {
		updates, err := api.MessagesSendMedia(ctx, &tg.MessagesSendMediaRequest{
			Peer:     peer,
			Media:    media,
			RandomID: time.Now().UnixNano(),
		})
		if err == nil {
			return updates, nil
		}

		if waitErr := extractFloodWait(err); waitErr > 0 {
			log.Printf("FLOOD_WAIT: sleeping %v before retry (send media, attempt %d)", waitErr, attempt+1)
			select {
			case <-time.After(waitErr + time.Duration(attempt)*time.Second):
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		return nil, fmt.Errorf("failed to send media: %w", err)
	}
	return nil, fmt.Errorf("exceeded max retries for send media")
}
