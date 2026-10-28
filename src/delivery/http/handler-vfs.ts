import type { Request, Response, NextFunction } from 'express';
import type { VFSUsecase } from '../../usecase/vfs.usecase.js';
import { getAuthUserId } from './middleware.js';

export class VFSHandler {
  private vfsUsecase: VFSUsecase;

  constructor(vfsUsecase: VFSUsecase) {
    this.vfsUsecase = vfsUsecase;
  }

  public handleListDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const folderIdParam = req.query.folder_id as string | undefined;
      const folderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

      const listing = await this.vfsUsecase.listDirectory(userId, folderId);
      res.status(200).json(listing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list directory' });
    }
  };

  public handleCreateFolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { name, parent_id } = req.body || {};

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const parentId = typeof parent_id === 'number' ? parent_id : parent_id ? parseInt(parent_id, 10) : null;
      const folder = await this.vfsUsecase.createFolder(userId, name, parentId);
      res.status(201).json(folder);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create folder' });
    }
  };

  public handleRenameFolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const folderId = parseInt(req.params.id, 10);
      const { name } = req.body || {};

      if (isNaN(folderId)) {
        res.status(400).json({ error: 'invalid folder id' });
        return;
      }
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const folder = await this.vfsUsecase.renameFolder(userId, folderId, name);
      res.status(200).json(folder);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to rename folder' });
    }
  };

  public handleRenameFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = parseInt(req.params.id, 10);
      const { name } = req.body || {};

      if (isNaN(fileId)) {
        res.status(400).json({ error: 'invalid file id' });
        return;
      }
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const file = await this.vfsUsecase.renameFile(userId, fileId, name);
      res.status(200).json(file);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to rename file' });
    }
  };

  public handleMoveFolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const folderId = parseInt(req.params.id, 10);
      const { parent_id } = req.body || {};

      if (isNaN(folderId)) {
        res.status(400).json({ error: 'invalid folder id' });
        return;
      }

      const newParentId =
        parent_id === null || parent_id === undefined
          ? null
          : typeof parent_id === 'number'
          ? parent_id
          : parseInt(parent_id, 10);

      const folder = await this.vfsUsecase.moveFolder(userId, folderId, newParentId);
      res.status(200).json(folder);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to move folder' });
    }
  };

  public handleMoveFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = parseInt(req.params.id, 10);
      const { folder_id } = req.body || {};

      if (isNaN(fileId)) {
        res.status(400).json({ error: 'invalid file id' });
        return;
      }

      const newFolderId =
        folder_id === null || folder_id === undefined
          ? null
          : typeof folder_id === 'number'
          ? folder_id
          : parseInt(folder_id, 10);

      const file = await this.vfsUsecase.moveFile(userId, fileId, newFolderId);
      res.status(200).json(file);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to move file' });
    }
  };

  public handleDeleteFolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const folderId = parseInt(req.params.id, 10);

      if (isNaN(folderId)) {
        res.status(400).json({ error: 'invalid folder id' });
        return;
      }

      await this.vfsUsecase.deleteFolder(userId, folderId);
      res.status(200).json({ message: 'folder deleted' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete folder' });
    }
  };

  public handleDeleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = parseInt(req.params.id, 10);

      if (isNaN(fileId)) {
        res.status(400).json({ error: 'invalid file id' });
        return;
      }

      await this.vfsUsecase.deleteFile(userId, fileId);
      res.status(200).json({ message: 'file deleted' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete file' });
    }
  };

  public handleListTrash = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const listing = await this.vfsUsecase.listTrash(userId);
      res.status(200).json(listing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list trash' });
    }
  };

  public handleRestore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { type, id } = req.params;
      const itemId = parseInt(id, 10);

      if (isNaN(itemId)) {
        res.status(400).json({ error: 'invalid id' });
        return;
      }

      if (type === 'folder') {
        await this.vfsUsecase.restoreFolder(userId, itemId);
      } else if (type === 'file') {
        await this.vfsUsecase.restoreFile(userId, itemId);
      } else {
        res.status(400).json({ error: "type must be 'folder' or 'file'" });
        return;
      }

      res.status(200).json({ message: `${type} restored` });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to restore item' });
    }
  };

  public handleEmptyTrash = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      await this.vfsUsecase.emptyTrash(userId);
      res.status(200).json({ message: 'trash emptied' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to empty trash' });
    }
  };

  public handleGetBreadcrumb = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const folderIdParam = req.query.folder_id as string | undefined;

      if (!folderIdParam) {
        res.status(400).json({ error: 'folder_id is required' });
        return;
      }

      const folderId = parseInt(folderIdParam, 10);
      if (isNaN(folderId)) {
        res.status(400).json({ error: 'invalid folder_id' });
        return;
      }

      const breadcrumb = await this.vfsUsecase.getBreadcrumb(userId, folderId);
      res.status(200).json({ breadcrumb });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get breadcrumb' });
    }
  };

  public handleListStarred = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const listing = await this.vfsUsecase.listStarred(userId);
      res.status(200).json(listing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list starred items' });
    }
  };

  public handleToggleStar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { type, id } = req.params;
      const itemId = parseInt(id, 10);

      if (isNaN(itemId)) {
        res.status(400).json({ error: 'invalid id' });
        return;
      }

      await this.vfsUsecase.toggleStar(userId, type as 'folder' | 'file', itemId);
      res.status(200).json({ message: 'starred status updated' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update starred status' });
    }
  };

  public handleUpdateCaption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = parseInt(req.params.id, 10);
      const { caption } = req.body || {};

      if (isNaN(fileId)) {
        res.status(400).json({ error: 'invalid file id' });
        return;
      }

      if (typeof caption !== 'string') {
        res.status(400).json({ error: 'caption must be a string' });
        return;
      }

      const file = await this.vfsUsecase.updateCaption(userId, fileId, caption);
      res.status(200).json(file);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update caption' });
    }
  };

  public handleListAllFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const files = await this.vfsUsecase.listAllFiles(userId);
      res.status(200).json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list files' });
    }
  };

  public handleSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const result = await this.vfsUsecase.syncWithTelegram(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync cloud data' });
    }
  };

  // ─── Vault Handlers ───────────────────────────────────────────
  public handleGetVaultStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const status = await this.vfsUsecase.getVaultStatus(userId);
      res.status(200).json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get vault status' });
    }
  };

  public handleSetupVaultPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { pin } = req.body || {};
      const result = await this.vfsUsecase.setupVaultPin(userId, pin);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to setup vault PIN' });
    }
  };

  public handleVerifyVaultPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { pin } = req.body || {};
      const result = await this.vfsUsecase.verifyVaultPin(userId, pin);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'PIN Brankas salah' });
    }
  };

  public handleChangeVaultPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { currentPin, newPin } = req.body || {};
      await this.vfsUsecase.changeVaultPin(userId, currentPin, newPin);
      res.status(200).json({ message: 'Vault PIN changed successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to change vault PIN' });
    }
  };

  public handleListVaultItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const vaultToken = (req.headers['x-vault-token'] as string) || (req.query.vault_token as string);
      if (!this.vfsUsecase.verifyVaultToken(userId, vaultToken)) {
        res.status(403).json({ error: 'Vault is locked. Valid vault token is required.' });
        return;
      }

      const items = await this.vfsUsecase.listVaultItems(userId);
      res.status(200).json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list vault items' });
    }
  };

  public handleToggleVaultStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { fileIds, folderIds, isVault } = req.body || {};
      const targetIsVault = Boolean(isVault);

      // If moving OUT of vault (unlocking), ensure vault token is verified
      if (!targetIsVault) {
        const vaultToken = (req.headers['x-vault-token'] as string) || (req.query.vault_token as string);
        if (!this.vfsUsecase.verifyVaultToken(userId, vaultToken)) {
          res.status(403).json({ error: 'Vault is locked. Valid vault token is required.' });
          return;
        }
      }

      const parsedFileIds = Array.isArray(fileIds) ? fileIds.map((id: any) => parseInt(id, 10)).filter((n) => !isNaN(n)) : [];
      const parsedFolderIds = Array.isArray(folderIds) ? folderIds.map((id: any) => parseInt(id, 10)).filter((n) => !isNaN(n)) : [];

      await this.vfsUsecase.toggleVaultStatus(userId, parsedFileIds, parsedFolderIds, targetIsVault);
      res.status(200).json({ message: targetIsVault ? 'Items locked into vault' : 'Items restored from vault' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update vault status' });
    }
  };
}
