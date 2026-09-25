import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import type { AuthUsecase } from '../../usecase/auth.usecase.js';
import type { VFSUsecase } from '../../usecase/vfs.usecase.js';
import type { StreamUsecase } from '../../usecase/stream.usecase.js';
import type { ShareUsecase } from '../../usecase/share.usecase.js';
import { AuthHandler } from './handler-auth.js';
import { VFSHandler } from './handler-vfs.js';
import { StreamHandler } from './handler-stream.js';
import { ShareHandler } from './handler-share.js';
import { jwtMiddleware, errorHandler } from './middleware.js';

export function createServer(
  jwtSecret: string,
  authUsecase: AuthUsecase,
  vfsUsecase: VFSUsecase,
  streamUsecase: StreamUsecase,
  shareUsecase?: ShareUsecase
): express.Express {
  const app = express();

  // CORS middleware
  app.use(
    cors({
      origin: '*',
      allowedHeaders: [
        'Origin',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-File-Name',
        'X-File-Size',
        'X-File-Id',
        'X-Part-Index',
        'X-Total-Parts',
        'X-Is-Big',
        'Content-Length',
        'X-Share-Password',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  const authHandler = new AuthHandler(authUsecase);
  const vfsHandler = new VFSHandler(vfsUsecase);
  const streamHandler = new StreamHandler(streamUsecase);
  const shareHandler = shareUsecase ? new ShareHandler(shareUsecase) : null;

  const authJwt = jwtMiddleware(jwtSecret);

  // Body parser for JSON endpoints (skip for file upload stream)
  const jsonParser = express.json({ limit: '10mb' });

  // ─── API Routes ────────────────────────────────────────────────────────────
  const api = express.Router();

  // Auth routes (public)
  api.post('/auth/send-code', jsonParser, authHandler.handleSendCode);
  api.post('/auth/sign-in', jsonParser, authHandler.handleSignIn);

  // Auth routes (protected)
  api.put('/auth/profile', authJwt, jsonParser, authHandler.handleUpdateProfile);

  // VFS routes (protected)
  api.get('/vfs/list', authJwt, vfsHandler.handleListDirectory);
  api.post('/vfs/folders', authJwt, jsonParser, vfsHandler.handleCreateFolder);
  api.patch('/vfs/folders/:id/rename', authJwt, jsonParser, vfsHandler.handleRenameFolder);
  api.patch('/vfs/folders/:id/move', authJwt, jsonParser, vfsHandler.handleMoveFolder);
  api.delete('/vfs/folders/:id', authJwt, vfsHandler.handleDeleteFolder);

  api.patch('/vfs/files/:id/rename', authJwt, jsonParser, vfsHandler.handleRenameFile);
  api.patch('/vfs/files/:id/move', authJwt, jsonParser, vfsHandler.handleMoveFile);
  api.patch('/vfs/files/:id/caption', authJwt, jsonParser, vfsHandler.handleUpdateCaption);
  api.delete('/vfs/files/:id', authJwt, vfsHandler.handleDeleteFile);

  api.get('/vfs/trash', authJwt, vfsHandler.handleListTrash);
  api.post('/vfs/restore/:type/:id', authJwt, vfsHandler.handleRestore);
  api.delete('/vfs/trash', authJwt, vfsHandler.handleEmptyTrash);

  api.get('/vfs/breadcrumb', authJwt, vfsHandler.handleGetBreadcrumb);
  api.get('/vfs/starred', authJwt, vfsHandler.handleListStarred);
  api.patch('/vfs/starred/:type/:id', authJwt, vfsHandler.handleToggleStar);

  // Gallery: list all files & sync with Telegram Saved Messages
  api.get('/vfs/memories', authJwt, vfsHandler.handleListAllFiles);
  api.post('/vfs/sync', authJwt, vfsHandler.handleSync);

  // Upload (raw body stream, don't use jsonParser)
  api.post('/vfs/upload', authJwt, streamHandler.handleUpload);
  api.post('/vfs/upload-chunk', authJwt, streamHandler.handleUploadChunk);
  api.post('/vfs/upload-complete', authJwt, jsonParser, streamHandler.handleUploadComplete);

  // Download (streaming)
  api.get('/vfs/download/:id', authJwt, streamHandler.handleDownload);

  // Share routes (protected)
  if (shareHandler) {
    api.post('/vfs/shares', authJwt, jsonParser, shareHandler.handleCreateShare);
    api.get('/vfs/shares', authJwt, shareHandler.handleListUserShares);
    api.get('/vfs/shares/item/:type/:id', authJwt, shareHandler.handleGetItemShare);
    api.delete('/vfs/shares/:id', authJwt, shareHandler.handleRevokeShare);

    // Public share routes (no auth needed)
    api.get('/public/shares/:token', shareHandler.handleGetPublicShare);
    api.get('/public/shares/:token/download', shareHandler.handleDownloadPublicShare);
  }

  app.use('/api', api);

  // ─── Static Frontend Serving & SPA Fallback ────────────────────────────────
  const distPath = path.resolve(process.cwd(), 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use(errorHandler);

  return app;
}
