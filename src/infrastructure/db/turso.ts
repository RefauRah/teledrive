import fs from 'fs';
import path from 'path';
import { createClient, type Client } from '@libsql/client';

export function createTursoClient(url: string, authToken?: string): Client {
  return createClient({
    url,
    authToken,
  });
}

export async function runTursoMigrations(client: Client, migrationsDir: string): Promise<void> {
  // Create migrations tracking table if not exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS goose_db_version (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id INTEGER NOT NULL,
      is_applied INTEGER NOT NULL,
      tstamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get applied version IDs
  const res = await client.execute(
    'SELECT version_id FROM goose_db_version WHERE is_applied = 1'
  );
  const appliedVersions = new Set(
    res.rows.map((r) => Number(r.version_id))
  );

  // Read migration files sorted by name
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) continue;

    const versionId = parseInt(match[1], 10);
    if (appliedVersions.has(versionId)) {
      continue;
    }

    console.log(`Applying Turso migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    // Extract Up migration section
    let upSql = rawContent;
    if (rawContent.includes('-- +goose Up')) {
      const afterUp = rawContent.split('-- +goose Up')[1];
      if (afterUp.includes('-- +goose Down')) {
        upSql = afterUp.split('-- +goose Down')[0];
      } else {
        upSql = afterUp;
      }
    }

    // Split SQL into individual statements while respecting triggers/blocks
    const statements = upSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.execute(stmt);
    }

    await client.execute({
      sql: 'INSERT INTO goose_db_version (version_id, is_applied, tstamp) VALUES (?, 1, CURRENT_TIMESTAMP)',
      args: [versionId],
    });

    console.log(`Successfully applied Turso migration: ${file}`);
  }
}
