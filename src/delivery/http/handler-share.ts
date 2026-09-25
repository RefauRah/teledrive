import type { Request, Response, NextFunction } from 'express';
import type { ShareUsecase } from '../../usecase/share.usecase.js';
import { getAuthUserId } from './middleware.js';

export class ShareHandler {
  private shareUsecase: ShareUsecase;

  constructor(shareUsecase: ShareUsecase) {
    this.shareUsecase = shareUsecase;
  }

  // ─── Protected Handlers ───────────────────────────────────────────────────

  public handleCreateShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { fileId, folderId, password, expiresInDays, maxDownloads } = req.body;

      const share = await this.shareUsecase.createShare(userId, {
        fileId: fileId ? parseInt(fileId, 10) : null,
        folderId: folderId ? parseInt(folderId, 10) : null,
        password: password || null,
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : null,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
      });

      res.status(201).json(share);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create share link' });
    }
  };

  public handleListUserShares = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const shares = await this.shareUsecase.listUserShares(userId);
      res.status(200).json(shares);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list shares' });
    }
  };

  public handleGetItemShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { type, id } = req.params;
      if (type !== 'file' && type !== 'folder') {
        res.status(400).json({ error: 'Invalid type' });
        return;
      }
      const itemId = parseInt(id, 10);
      if (isNaN(itemId)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const share = await this.shareUsecase.getShareForItem(userId, type, itemId);
      res.status(200).json(share || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get share info' });
    }
  };

  public handleRevokeShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const shareId = parseInt(req.params.id, 10);
      if (isNaN(shareId)) {
        res.status(400).json({ error: 'Invalid share id' });
        return;
      }

      await this.shareUsecase.revokeShare(userId, shareId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to revoke share link' });
    }
  };

  // ─── Public Handlers (No Auth Required) ───────────────────────────────────

  public handleGetPublicShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const password = (req.headers['x-share-password'] as string) || (req.query.password as string) || undefined;

      const data = await this.shareUsecase.getShareByToken(token, password);
      res.status(200).json(data);
    } catch (err: any) {
      const status = err.message === 'Kata sandi salah' ? 401 : 404;
      res.status(status).json({ error: err.message || 'Share link not accessible' });
    }
  };

  public handleDownloadPublicShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const fileIdParam = req.query.file_id as string | undefined;
      const fileId = fileIdParam ? parseInt(fileIdParam, 10) : null;
      const password = (req.headers['x-share-password'] as string) || (req.query.password as string) || undefined;

      const metadata = await this.shareUsecase.getSharedFileMetadata(token, fileId, password);

      res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.name)}"`);
      if (metadata.size > 0) {
        res.setHeader('Content-Length', metadata.size.toString());
      }

      await this.shareUsecase.downloadSharedFile(token, fileId, res, password);
      res.end();
    } catch (err: any) {
      console.error('Public download error:', err);
      if (!res.headersSent) {
        const status = err.message === 'Kata sandi salah' ? 401 : 404;
        res.status(status).json({ error: err.message || 'Failed to download shared file' });
      }
    }
  };
}
