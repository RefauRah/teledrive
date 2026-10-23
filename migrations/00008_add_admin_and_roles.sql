-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- 1. Add admin role, password_hash, is_banned, and storage_quota_bytes to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN storage_quota_bytes INTEGER DEFAULT NULL;

-- 2. Indexes for user roles and usernames
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 3. Seed default admin account if not already present
-- Default credentials:
-- Username: admin
-- Password: admin123 (hash format: salt:scryptSync_hex)
-- Salt: c83a1b02d847169ef37248e9d1234567
-- Hash: c4eba084fc7bd3b7d636812465bb1be78e94d12c402565e733f144511c2efc0f262084a88bb16d4c687c4a928c2ba81f8771d0ca24e90d422324831392a56273
INSERT OR IGNORE INTO users (
    telegram_id,
    phone,
    username,
    first_name,
    last_name,
    photo_url,
    session_data,
    role,
    password_hash,
    is_banned,
    storage_quota_bytes,
    created_at,
    updated_at
) VALUES (
    '0',
    '+62000000000',
    'admin',
    'Super',
    'Admin',
    '',
    '',
    'admin',
    'c83a1b02d847169ef37248e9d1234567:c4eba084fc7bd3b7d636812465bb1be78e94d12c402565e733f144511c2efc0f262084a88bb16d4c687c4a928c2ba81f8771d0ca24e90d422324831392a56273',
    0,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DELETE FROM users WHERE username = 'admin' AND role = 'admin';
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users DROP COLUMN storage_quota_bytes;
ALTER TABLE users DROP COLUMN is_banned;
ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users DROP COLUMN role;
