import type { Request, Response, NextFunction } from 'express';
import type { AdminUsecase } from '../../usecase/admin.usecase.js';
import { getAuthUserId } from './middleware.js';

export class AdminHandler {
  private adminUsecase: AdminUsecase;

  constructor(adminUsecase: AdminUsecase) {
    this.adminUsecase = adminUsecase;
  }

  public handleGetStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.adminUsecase.getSystemStats();
      res.status(200).json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil statistik sistem' });
    }
  };

  public handleListUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = (req.query.search as string) || undefined;
      const role = (req.query.role as string) || undefined;
      const isBannedQuery = req.query.is_banned as string;
      const isBanned = isBannedQuery !== undefined ? isBannedQuery === 'true' || isBannedQuery === '1' : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await this.adminUsecase.listUsers({
        search,
        role,
        isBanned,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil daftar pengguna' });
    }
  };

  public handleCreateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, phone, first_name, last_name, role, storage_quota_bytes } = req.body || {};
      const newUser = await this.adminUsecase.createUser({
        username,
        password,
        phone,
        first_name,
        last_name,
        role,
        storage_quota_bytes,
      });

      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal membuat pengguna' });
    }
  };

  public handleUpdateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      const targetUserId = parseInt(req.params.id, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'ID pengguna tidak valid' });
        return;
      }

      const { role, is_banned, storage_quota_bytes, reset_vault_pin } = req.body || {};

      if (role !== undefined) {
        await this.adminUsecase.updateUserRole(adminUserId, targetUserId, role);
      }

      if (is_banned !== undefined) {
        await this.adminUsecase.updateUserBanStatus(adminUserId, targetUserId, Boolean(is_banned));
      }

      if (storage_quota_bytes !== undefined) {
        const quota = storage_quota_bytes === null ? null : Number(storage_quota_bytes);
        await this.adminUsecase.updateUserQuota(targetUserId, quota);
      }

      if (reset_vault_pin === true) {
        await this.adminUsecase.resetUserVaultPin(targetUserId);
      }

      res.status(200).json({ success: true, message: 'Data pengguna berhasil diperbarui' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal memperbarui pengguna' });
    }
  };

  public handleDeleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      const targetUserId = parseInt(req.params.id, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'ID pengguna tidak valid' });
        return;
      }

      await this.adminUsecase.deleteUser(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Pengguna berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal menghapus pengguna' });
    }
  };

  public handleListFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = (req.query.search as string) || undefined;
      const category = (req.query.category as string) || undefined;
      const isVaultQuery = req.query.is_vault as string;
      const isVault = isVaultQuery !== undefined ? isVaultQuery === 'true' || isVaultQuery === '1' : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await this.adminUsecase.listFiles({
        search,
        category,
        isVault,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil daftar file' });
    }
  };

  public handleDeleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'ID file tidak valid' });
        return;
      }

      await this.adminUsecase.deleteFile(fileId);
      res.status(200).json({ success: true, message: 'File berhasil dihapus dari sistem' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal menghapus file' });
    }
  };

  public handleGetConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = this.adminUsecase.getSystemConfig();
      res.status(200).json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengambil konfigurasi' });
    }
  };
}
