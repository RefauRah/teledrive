package migrations

import "embed"

// EmbedFS contains the embedded SQL migration files for goose.
//
//go:embed *.sql
var EmbedFS embed.FS
