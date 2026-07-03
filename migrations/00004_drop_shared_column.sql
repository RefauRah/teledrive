-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE folders DROP COLUMN is_shared;
ALTER TABLE files DROP COLUMN is_shared;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE folders ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE files ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;
