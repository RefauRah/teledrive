-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- 1. Add vault PIN to users table
ALTER TABLE users ADD COLUMN vault_pin TEXT DEFAULT NULL;

-- 2. Add is_vault to files table
ALTER TABLE files ADD COLUMN is_vault INTEGER NOT NULL DEFAULT 0;

-- 3. Add is_vault to folders table
ALTER TABLE folders ADD COLUMN is_vault INTEGER NOT NULL DEFAULT 0;

-- 4. Create Indexes for vault queries
CREATE INDEX IF NOT EXISTS idx_files_vault ON files(user_id, is_vault) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_vault ON folders(user_id, is_vault) WHERE deleted_at IS NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX IF EXISTS idx_folders_vault;
DROP INDEX IF EXISTS idx_files_vault;
-- SQLite older versions do not drop columns easily
