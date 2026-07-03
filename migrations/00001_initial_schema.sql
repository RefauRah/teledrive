-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- 1. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL DEFAULT '',
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    session_data TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create Folders Table (VFS - Adjacency List)
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, parent_id, name)
);

-- 3. Create Files Table (VFS)
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
    telegram_message_id INTEGER NOT NULL,
    telegram_chat_id BIGINT NOT NULL,
    telegram_file_id VARCHAR(255) NOT NULL DEFAULT '',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, folder_id, name)
);

-- 4. Create Auth Transactions Table (State login sementara)
CREATE TABLE auth_transactions (
    id VARCHAR(100) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    phone_code_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Create Indexes for optimization
CREATE INDEX idx_folders_parent ON folders(user_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_folder ON files(user_id, folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_trash ON folders(user_id) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_files_trash ON files(user_id) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

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
