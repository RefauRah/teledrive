-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL DEFAULT '',
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    session_data TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Folders Table (VFS - Adjacency List)
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    deleted_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, parent_id, name)
);

-- 3. Create Files Table (VFS)
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    telegram_message_id INTEGER NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    telegram_file_id TEXT NOT NULL DEFAULT '',
    deleted_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, folder_id, name)
);

-- 4. Create Auth Transactions Table (State login sementara)
CREATE TABLE IF NOT EXISTS auth_transactions (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    phone_code_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(user_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(user_id, folder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_trash ON folders(user_id) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_trash ON files(user_id) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX IF EXISTS idx_users_telegram_id;
DROP INDEX IF EXISTS idx_files_trash;
DROP INDEX IF EXISTS idx_folders_trash;
DROP INDEX IF EXISTS idx_files_folder;
DROP INDEX IF EXISTS idx_folders_parent;

DROP TABLE IF EXISTS auth_transactions;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS users;
