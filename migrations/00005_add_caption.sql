-- +goose Up
ALTER TABLE files ADD COLUMN caption TEXT DEFAULT '';

-- +goose Down
-- SQLite does not support DROP COLUMN in older versions.
-- ALTER TABLE files DROP COLUMN caption;
