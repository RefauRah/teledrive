package telegram

import (
	"strings"
	"time"

	"github.com/gotd/td/tgerr"
)

// extractFloodWait checks if the error is a Telegram FLOOD_WAIT error and returns
// the wait duration. Returns 0 if not a FLOOD_WAIT error.
func extractFloodWait(err error) time.Duration {
	if err == nil {
		return 0
	}

	// Use gotd's built-in error handling.
	if rpcErr, ok := tgerr.As(err); ok {
		if rpcErr.Type == "FLOOD_WAIT" || strings.HasPrefix(rpcErr.Message, "FLOOD_WAIT") {
			seconds := rpcErr.Argument
			if seconds <= 0 {
				seconds = 5 // default wait if no argument
			}
			return time.Duration(seconds) * time.Second
		}
	}

	return 0
}
