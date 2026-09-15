import path from 'path';
import { loadConfig } from './infrastructure/config/config.js';
import { createTursoClient, runTursoMigrations } from './infrastructure/db/turso.js';
import { ClientPool } from './infrastructure/telegram/client-pool.js';
import { Uploader } from './infrastructure/telegram/uploader.js';
import { Downloader } from './infrastructure/telegram/downloader.js';
import { TursoUserRepository } from './repository/turso-user.repository.js';
import { TursoFolderRepository } from './repository/turso-folder.repository.js';
import { TursoFileRepository } from './repository/turso-file.repository.js';
import { TursoAuthRepository } from './repository/turso-auth.repository.js';
import { AuthUsecase } from './usecase/auth.usecase.js';
import { VFSUsecase } from './usecase/vfs.usecase.js';
import { StreamUsecase } from './usecase/stream.usecase.js';
import { createServer } from './delivery/http/server.js';

async function bootstrap(): Promise<void> {
  // 1. Load configuration
  console.log('Loading configuration...');
  const cfg = loadConfig();

  // 2. Connect to Turso / SQLite database
  console.log(`Connecting to database (${cfg.tursoDatabaseUrl})...`);
  const db = createTursoClient(cfg.tursoDatabaseUrl, cfg.tursoAuthToken);
  try {
    await db.execute('SELECT 1');
    console.log('Connected to database successfully.');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  // 3. Run database migrations
  console.log('Running database migrations...');
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  try {
    await runTursoMigrations(db, migrationsDir);
  } catch (err) {
    console.error('Database migration failed:', err);
    process.exit(1);
  }

  // 4. Initialize Telegram client pool
  console.log('Initializing Telegram client pool...');
  const clientPool = new ClientPool(
    cfg.telegramApiId,
    cfg.telegramApiHash,
    db,
    cfg.encryptionKey
  );

  // 5. Initialize Repositories
  const userRepo = new TursoUserRepository(db);
  const folderRepo = new TursoFolderRepository(db);
  const fileRepo = new TursoFileRepository(db);
  const authRepo = new TursoAuthRepository(db);

  // 6. Initialize Usecases & Helpers
  const authUC = new AuthUsecase(authRepo, userRepo, cfg, clientPool);
  const vfsUC = new VFSUsecase(folderRepo, fileRepo, clientPool);

  const uploader = new Uploader();
  const downloader = new Downloader();
  const streamUC = new StreamUsecase(fileRepo, userRepo, clientPool, uploader, downloader);

  // 7. Setup HTTP server
  const app = createServer(cfg.jwtSecret, authUC, vfsUC, streamUC);

  const server = app.listen(cfg.port, () => {
    console.log(`Server starting on port ${cfg.port}...`);
  });

  // 8. Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`Received signal ${signal}. Initiating graceful shutdown...`);

    server.close(async () => {
      console.log('HTTP server closed.');

      console.log('Closing Telegram client pool...');
      await clientPool.close();

      console.log('Closing database connection...');
      db.close();

      console.log('TeleDrive stopped gracefully.');
      process.exit(0);
    });

    // Force close after 15 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
