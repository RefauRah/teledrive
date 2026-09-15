import path from 'path';
import { loadConfig } from '../src/infrastructure/config/config.js';
import { createTursoClient, runTursoMigrations } from '../src/infrastructure/db/turso.js';
import { ClientPool } from '../src/infrastructure/telegram/client-pool.js';
import { Uploader } from '../src/infrastructure/telegram/uploader.js';
import { Downloader } from '../src/infrastructure/telegram/downloader.js';
import { TursoUserRepository } from '../src/repository/turso-user.repository.js';
import { TursoFolderRepository } from '../src/repository/turso-folder.repository.js';
import { TursoFileRepository } from '../src/repository/turso-file.repository.js';
import { TursoAuthRepository } from '../src/repository/turso-auth.repository.js';
import { AuthUsecase } from '../src/usecase/auth.usecase.js';
import { VFSUsecase } from '../src/usecase/vfs.usecase.js';
import { StreamUsecase } from '../src/usecase/stream.usecase.js';
import { createServer } from '../src/delivery/http/server.js';

let appInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cfg = loadConfig();
    const db = createTursoClient(cfg.tursoDatabaseUrl, cfg.tursoAuthToken);

    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    try {
      await runTursoMigrations(db, migrationsDir);
    } catch (err) {
      console.warn('Migration warning:', err);
    }

    const clientPool = new ClientPool(
      cfg.telegramApiId,
      cfg.telegramApiHash,
      db,
      cfg.encryptionKey
    );

    const userRepo = new TursoUserRepository(db);
    const folderRepo = new TursoFolderRepository(db);
    const fileRepo = new TursoFileRepository(db);
    const authRepo = new TursoAuthRepository(db);

    const authUC = new AuthUsecase(authRepo, userRepo, cfg, clientPool);
    const vfsUC = new VFSUsecase(folderRepo, fileRepo, clientPool);

    const uploader = new Uploader();
    const downloader = new Downloader();
    const streamUC = new StreamUsecase(fileRepo, userRepo, clientPool, uploader, downloader);

    appInstance = createServer(cfg.jwtSecret, authUC, vfsUC, streamUC);
    return appInstance;
  })();

  return initPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
