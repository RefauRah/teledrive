-- +goose Up
CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    expires_at DATETIME,
    max_downloads INTEGER,
    download_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shares_file ON shares(user_id, file_id) WHERE file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shares_folder ON shares(user_id, folder_id) WHERE folder_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_shares_folder;
DROP INDEX IF EXISTS idx_shares_file;
DROP INDEX IF EXISTS idx_shares_token;
DROP TABLE IF EXISTS shares;
