import crypto from 'crypto';
import type { Writable } from 'stream';
import type { Share, ShareRepository } from '../domain/share.js';
import type { FileRepository } from '../domain/file.js';
import type { FolderRepository } from '../domain/folder.js';
import type { UserRepository } from '../domain/user.js';
import type { ClientPool } from '../infrastructure/telegram/client-pool.js';
import type { Downloader } from '../infrastructure/telegram/downloader.js';

export interface CreateShareRequest {
  fileId?: number | null;
  folderId?: number | null;
  password?: string | null;
  expiresInDays?: number | null;
  maxDownloads?: number | null;
}

export interface PublicShareResponse {
  shareToken: string;
  type: 'file' | 'folder';
  isPasswordProtected: boolean;
  isAuthorized: boolean;
  expiresAt: Date | null;
  maxDownloads: number | null;
  downloadCount: number;
  ownerName: string;
  item: {
    id: number;
    name: string;
    size?: number;
    mimeType?: string;
    caption?: string;
    createdAt: Date;
    files?: Array<{
      id: number;
      name: string;
      size: number;
      mimeType: string;
      createdAt: Date;
    }>;
  } | null;
}

export class ShareUsecase {
  private shareRepo: ShareRepository;
  private fileRepo: FileRepository;
  private folderRepo: FolderRepository;
  private userRepo: UserRepository;
  private clientPool: ClientPool;
  private downloader: Downloader;

  constructor(
    shareRepo: ShareRepository,
    fileRepo: FileRepository,
    folderRepo: FolderRepository,
    userRepo: UserRepository,
    clientPool: ClientPool,
    downloader: Downloader
  ) {
    this.shareRepo = shareRepo;
    this.fileRepo = fileRepo;
    this.folderRepo = folderRepo;
    this.userRepo = userRepo;
    this.clientPool = clientPool;
    this.downloader = downloader;
  }

  public async createShare(userId: number, req: CreateShareRequest): Promise<Share> {
    if (!req.fileId && !req.folderId) {
      throw new Error('fileId or folderId must be provided');
    }

    if (req.fileId) {
      const file = await this.fileRepo.getById(req.fileId);
      if (!file || file.user_id !== userId) {
        throw new Error('File not found or unauthorized');
      }
      if (file.deleted_at) {
        throw new Error('Cannot share a deleted file');
      }
    }

    if (req.folderId) {
      const folder = await this.folderRepo.getById(req.folderId);
      if (!folder || folder.user_id !== userId) {
        throw new Error('Folder not found or unauthorized');
      }
      if (folder.deleted_at) {
        throw new Error('Cannot share a deleted folder');
      }
    }

    // Generate secure unique token (URL-safe)
    const token = crypto.randomBytes(16).toString('base64url');

    let passwordHash: string | null = null;
    if (req.password && req.password.trim().length > 0) {
      passwordHash = crypto.createHash('sha256').update(req.password.trim()).digest('hex');
    }

    let expiresAt: Date | null = null;
    if (req.expiresInDays && req.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + req.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const share = await this.shareRepo.create({
      user_id: userId,
      file_id: req.fileId ?? null,
      folder_id: req.folderId ?? null,
      share_token: token,
      password_hash: passwordHash,
      expires_at: expiresAt,
      max_downloads: req.maxDownloads && req.maxDownloads > 0 ? req.maxDownloads : null,
    });

    return share;
  }

  public async getShareByToken(token: string, password?: string): Promise<PublicShareResponse> {
    const share = await this.shareRepo.getByToken(token);
    if (!share || !share.is_active) {
      throw new Error('Tautan tidak ditemukan atau sudah dinonaktifkan');
    }

    if (share.expires_at && new Date() > share.expires_at) {
      throw new Error('Tautan sudah kedaluwarsa');
    }

    if (share.max_downloads !== null && share.download_count >= share.max_downloads) {
      throw new Error('Batas maksimal download untuk tautan ini telah tercapai');
    }

    const owner = await this.userRepo.getById(share.user_id);
    const ownerName = owner
      ? [owner.first_name, owner.last_name].filter(Boolean).join(' ') || owner.username || 'Pengguna Teledrive'
      : 'Pengguna Teledrive';

    const isPasswordProtected = Boolean(share.password_hash);
    let isAuthorized = true;

    if (isPasswordProtected) {
      if (!password) {
        isAuthorized = false;
        return {
          shareToken: share.share_token,
          type: share.file_id ? 'file' : 'folder',
          isPasswordProtected: true,
          isAuthorized: false,
          expiresAt: share.expires_at,
          maxDownloads: share.max_downloads,
          downloadCount: share.download_count,
          ownerName,
          item: null,
        };
      }

      const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      if (inputHash !== share.password_hash) {
        throw new Error('Kata sandi salah');
      }
    }

    // Fetch details
    if (share.file_id) {
      const file = await this.fileRepo.getById(share.file_id);
      if (!file || file.deleted_at) {
        throw new Error('Berkas sudah tidak tersedia atau telah dihapus');
      }

      return {
        shareToken: share.share_token,
        type: 'file',
        isPasswordProtected,
        isAuthorized: true,
        expiresAt: share.expires_at,
        maxDownloads: share.max_downloads,
        downloadCount: share.download_count,
        ownerName,
        item: {
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mime_type,
          caption: file.caption,
          createdAt: file.created_at,
        },
      };
    } else if (share.folder_id) {
      const folder = await this.folderRepo.getById(share.folder_id);
      if (!folder || folder.deleted_at) {
        throw new Error('Folder sudah tidak tersedia atau telah dihapus');
      }

      const files = await this.fileRepo.listByFolder(share.user_id, folder.id);

      return {
        shareToken: share.share_token,
        type: 'folder',
        isPasswordProtected,
        isAuthorized: true,
        expiresAt: share.expires_at,
        maxDownloads: share.max_downloads,
        downloadCount: share.download_count,
        ownerName,
        item: {
          id: folder.id,
          name: folder.name,
          createdAt: folder.created_at,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            mimeType: f.mime_type,
            createdAt: f.created_at,
          })),
        },
      };
    }

    throw new Error('Invalid share configuration');
  }

  public async downloadSharedFile(
    token: string,
    fileId: number | null,
    writer: Writable,
    password?: string
  ): Promise<{ fileName: string; fileSize: number; mimeType: string }> {
    const share = await this.shareRepo.getByToken(token);
    if (!share || !share.is_active) {
      throw new Error('Tautan tidak ditemukan atau sudah dinonaktifkan');
    }

    if (share.expires_at && new Date() > share.expires_at) {
      throw new Error('Tautan sudah kedaluwarsa');
    }

    if (share.max_downloads !== null && share.download_count >= share.max_downloads) {
      throw new Error('Batas maksimal download untuk tautan ini telah tercapai');
    }

    if (share.password_hash) {
      if (!password) {
        throw new Error('Kata sandi diperlukan');
      }
      const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      if (inputHash !== share.password_hash) {
        throw new Error('Kata sandi salah');
      }
    }

    let targetFileId = share.file_id;
    if (share.folder_id) {
      if (!fileId) {
        throw new Error('fileId is required when downloading from a shared folder');
      }
      // Check that the file belongs to this folder and owner
      const f = await this.fileRepo.getById(fileId);
      if (!f || f.user_id !== share.user_id || f.folder_id !== share.folder_id || f.deleted_at) {
        throw new Error('File not found in this shared folder');
      }
      targetFileId = f.id;
    }

    if (!targetFileId) {
      throw new Error('No file specified to download');
    }

    const file = await this.fileRepo.getById(targetFileId);
    if (!file || file.deleted_at) {
      throw new Error('File not found');
    }

    const owner = await this.userRepo.getById(share.user_id);
    if (!owner) {
      throw new Error('Owner not found');
    }

    const client = await this.clientPool.getClient(share.user_id, owner.session_data);
    await this.downloader.downloadFile(client, file.telegram_message_id, writer);

    // Increment download count
    await this.shareRepo.incrementDownloadCount(share.id);

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mime_type,
    };
  }

  public async getSharedFileMetadata(
    token: string,
    fileId: number | null,
    password?: string
  ): Promise<{ id: number; name: string; size: number; mimeType: string }> {
    const share = await this.shareRepo.getByToken(token);
    if (!share || !share.is_active) {
      throw new Error('Tautan tidak ditemukan atau sudah dinonaktifkan');
    }

    if (share.expires_at && new Date() > share.expires_at) {
      throw new Error('Tautan sudah kedaluwarsa');
    }

    if (share.max_downloads !== null && share.download_count >= share.max_downloads) {
      throw new Error('Batas maksimal download untuk tautan ini telah tercapai');
    }

    if (share.password_hash) {
      if (!password) {
        throw new Error('Kata sandi diperlukan');
      }
      const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      if (inputHash !== share.password_hash) {
        throw new Error('Kata sandi salah');
      }
    }

    let targetFileId = share.file_id;
    if (share.folder_id) {
      if (!fileId) {
        throw new Error('fileId is required when downloading from a shared folder');
      }
      const f = await this.fileRepo.getById(fileId);
      if (!f || f.user_id !== share.user_id || f.folder_id !== share.folder_id || f.deleted_at) {
        throw new Error('File not found in this shared folder');
      }
      targetFileId = f.id;
    }

    if (!targetFileId) {
      throw new Error('No file specified');
    }

    const file = await this.fileRepo.getById(targetFileId);
    if (!file || file.deleted_at) {
      throw new Error('File not found');
    }

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mime_type,
    };
  }

  public async listUserShares(userId: number): Promise<Share[]> {
    return this.shareRepo.listByUser(userId);
  }

  public async getShareForItem(userId: number, type: 'file' | 'folder', id: number): Promise<Share | null> {
    if (type === 'file') {
      return this.shareRepo.getByFileId(userId, id);
    } else {
      return this.shareRepo.getByFolderId(userId, id);
    }
  }

  public async revokeShare(userId: number, shareId: number): Promise<void> {
    const share = await this.shareRepo.getById(shareId);
    if (!share || share.user_id !== userId) {
      throw new Error('Share not found or unauthorized');
    }
    await this.shareRepo.delete(shareId);
  }
}
