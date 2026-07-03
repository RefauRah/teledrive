package telegram

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
)

const downloadChunkSize = 512 * 1024 // 512KB

// Downloader handles file downloads from Telegram.
type Downloader struct{}

// NewDownloader creates a new Downloader instance.
func NewDownloader() *Downloader {
	return &Downloader{}
}

// DownloadFile downloads a file from Telegram Saved Messages by message ID and streams
// the content to the provided writer.
func (d *Downloader) DownloadFile(
	ctx context.Context,
	client *telegram.Client,
	messageID int,
	chatID int64,
	writer io.Writer,
) error {
	api := client.API()

	// Get the message containing the file from Saved Messages.
	peer := &tg.InputPeerSelf{}

	msgs, err := d.getMessagesWithRetry(ctx, api, peer, []tg.InputMessageClass{
		&tg.InputMessageID{ID: messageID},
	})
	if err != nil {
		return fmt.Errorf("failed to get message %d: %w", messageID, err)
	}

	var messages []tg.MessageClass
	switch v := msgs.(type) {
	case *tg.MessagesMessages:
		messages = v.Messages
	case *tg.MessagesMessagesSlice:
		messages = v.Messages
	case *tg.MessagesChannelMessages:
		messages = v.Messages
	}

	if len(messages) == 0 {
		return fmt.Errorf("message %d not found", messageID)
	}

	msg, ok := messages[0].(*tg.Message)
	if !ok {
		return fmt.Errorf("unexpected message type for message %d", messageID)
	}

	// Extract document from the message media.
	media, ok := msg.Media.(*tg.MessageMediaDocument)
	if !ok {
		return fmt.Errorf("message %d does not contain a document", messageID)
	}

	doc, ok := media.Document.(*tg.Document)
	if !ok {
		return fmt.Errorf("unexpected document type in message %d", messageID)
	}

	// Build the input file location for download.
	location := &tg.InputDocumentFileLocation{
		ID:            doc.ID,
		AccessHash:    doc.AccessHash,
		FileReference: doc.FileReference,
	}

	// Download in chunks and stream to writer.
	var offset int64
	for {
		result, err := d.getFileWithRetry(ctx, api, location, offset, downloadChunkSize)
		if err != nil {
			return fmt.Errorf("failed to download chunk at offset %d: %w", offset, err)
		}

		var data []byte
		switch r := result.(type) {
		case *tg.UploadFile:
			data = r.Bytes
		case *tg.UploadFileCDNRedirect:
			return fmt.Errorf("CDN redirect not supported")
		default:
			return fmt.Errorf("unexpected upload result type")
		}

		if len(data) == 0 {
			break
		}

		if _, err := writer.Write(data); err != nil {
			return fmt.Errorf("failed to write data: %w", err)
		}

		offset += int64(len(data))

		// If we received less than the requested chunk size, we've reached the end.
		if len(data) < downloadChunkSize {
			break
		}
	}

	return nil
}

// getMessagesWithRetry retrieves messages with FLOOD_WAIT retry handling.
func (d *Downloader) getMessagesWithRetry(ctx context.Context, api *tg.Client, peer tg.InputPeerClass, ids []tg.InputMessageClass) (tg.MessagesMessagesClass, error) {
	maxRetries := 5
	for attempt := 0; attempt < maxRetries; attempt++ {
		msgs, err := api.MessagesGetMessages(ctx, ids)
		if err == nil {
			return msgs, nil
		}

		if waitDur := extractFloodWait(err); waitDur > 0 {
			log.Printf("FLOOD_WAIT: sleeping %v before retry (get messages, attempt %d)", waitDur, attempt+1)
			select {
			case <-time.After(waitDur + time.Duration(attempt)*time.Second):
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		return nil, err
	}
	return nil, fmt.Errorf("exceeded max retries for get messages")
}

// getFileWithRetry downloads a file chunk with FLOOD_WAIT retry handling.
func (d *Downloader) getFileWithRetry(ctx context.Context, api *tg.Client, location tg.InputFileLocationClass, offset int64, limit int) (tg.UploadFileClass, error) {
	maxRetries := 5
	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err := api.UploadGetFile(ctx, &tg.UploadGetFileRequest{
			Location: location,
			Offset:   offset,
			Limit:    limit,
		})
		if err == nil {
			return result, nil
		}

		if waitDur := extractFloodWait(err); waitDur > 0 {
			log.Printf("FLOOD_WAIT: sleeping %v before retry (get file, attempt %d)", waitDur, attempt+1)
			select {
			case <-time.After(waitDur + time.Duration(attempt)*time.Second):
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		return nil, err
	}
	return nil, fmt.Errorf("exceeded max retries for get file")
}
