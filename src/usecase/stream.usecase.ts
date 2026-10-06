import mime from 'mime-types';
import type { Readable, Writable } from 'stream';
import type { File, FileRepository } from '../domain/file.js';
import type { UserRepository } from '../domain/user.js';
import type { ClientPool } from '../infrastructure/telegram/client-pool.js';
import type { Uploader } from '../infrastructure/telegram/uploader.js';
import type { Downloader } from '../infrastructure/telegram/downloader.js';
import { type Config, isUserUnlimitedStorage, DEFAULT_STORAGE_QUOTA_BYTES } from '../infrastructure/config/config.js';

export interface DownloadResult {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface StorageUsageInfo {
  usedBytes: number;
  quotaBytes: number;
  isUnlimited: boolean;
  usedPercentage: number;
}

export class StreamUsecase {
  private fileRepo: FileRepository;
  private userRepo: UserRepository;
  private clientPool: ClientPool;
  private uploader: Uploader;
  private downloader: Downloader;
  private config?: Config;

  constructor(
    fileRepo: FileRepository,
    userRepo: UserRepository,
    clientPool: ClientPool,
    uploader: Uploader,
    downloader: Downloader,
    config?: Config
  ) {
    this.fileRepo = fileRepo;
    this.userRepo = userRepo;
    this.clientPool = clientPool;
    this.uploader = uploader;
    this.downloader = downloader;
    this.config = config;
  }

  public async getStorageUsage(userId: number): Promise<StorageUsageInfo> {
    const user = await this.userRepo.getById(userId);
    const usedBytes = await this.fileRepo.getTotalStorageUsed(userId);
    const quotaBytes = this.config?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES;
    const isUnlimited = this.config ? isUserUnlimitedStorage(this.config, user?.phone) : false;

    const usedPercentage = isUnlimited
      ? 0
      : Math.min(100, Math.round((usedBytes / quotaBytes) * 10000) / 100);

    return {
      usedBytes,
      quotaBytes,
      isUnlimited,
      usedPercentage,
    };
  }

  public async validateStorageQuota(userId: number, incomingFileSize: number): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (this.config && isUserUnlimitedStorage(this.config, user.phone)) {
      return; // Akun whitelisted unlimited
    }

    const currentUsed = await this.fileRepo.getTotalStorageUsed(userId);
    const quotaBytes = this.config?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES;

    if (currentUsed + incomingFileSize > quotaBytes) {
      const usedGB = (currentUsed / (1024 * 1024 * 1024)).toFixed(2);
      const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(0);
      const fileMB = (incomingFileSize / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Kapasitas penyimpanan ${quotaGB} GB terlampaui. Total terpakai: ${usedGB} GB / ${quotaGB} GB. Ukuran berkas: ${fileMB} MB. Hapus beberapa berkas untuk melanjutkan.`
      );
    }
  }

  public async upload(
    userId: number,
    folderId: number | null,
    fileName: string,
    fileSize: number,
    reader: Readable | Buffer
  ): Promise<File> {
    // Validasi kuota penyimpanan pengguna terlebih dahulu
    await this.validateStorageQuota(userId, fileSize);

    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const client = await this.clientPool.getClient(userId, user.session_data);
    const result = await this.uploader.uploadFile(client, reader, fileName, fileSize);

    const detectedMime = mime.lookup(fileName);
    const mimeType = detectedMime || 'application/octet-stream';

    const created = await this.fileRepo.create({
      user_id: userId,
      folder_id: folderId,
      name: fileName,
      size: fileSize,
      mime_type: mimeType,
      telegram_message_id: result.messageId,
      telegram_chat_id: result.chatId,
      telegram_file_id: result.fileId,
    });

    return created;
  }

  public async uploadChunk(
    userId: number,
    fileId: string,
    partIndex: number,
    totalParts: number,
    chunkBuffer: Buffer,
    isBig: boolean
  ): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const client = await this.clientPool.getClient(userId, user.session_data);
    await this.uploader.uploadChunk(client, fileId, partIndex, totalParts, chunkBuffer, isBig);
  }

  public async completeChunkUpload(
    userId: number,
    folderId: number | null,
    fileId: string,
    totalParts: number,
    fileName: string,
    fileSize: number,
    isBig: boolean
  ): Promise<File> {
    // Validasi kuota penyimpanan pengguna sebelum menyelesaikan upload
    await this.validateStorageQuota(userId, fileSize);

    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const client = await this.clientPool.getClient(userId, user.session_data);
    const result = await this.uploader.completeChunkUpload(client, fileId, totalParts, fileName, isBig);

    const detectedMime = mime.lookup(fileName);
    const mimeType = detectedMime || 'application/octet-stream';

    const created = await this.fileRepo.create({
      user_id: userId,
      folder_id: folderId,
      name: fileName,
      size: fileSize,
      mime_type: mimeType,
      telegram_message_id: result.messageId,
      telegram_chat_id: result.chatId,
      telegram_file_id: result.fileId,
    });

    return created;
  }

  public async download(
    userId: number,
    fileId: number,
    writer: Writable
  ): Promise<DownloadResult> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const client = await this.clientPool.getClient(userId, user.session_data);
    await this.downloader.downloadFile(client, file.telegram_message_id, writer);

    return {
      fileName: file.name,
      mimeType: file.mime_type,
      fileSize: file.size,
    };
  }

  public async getFileMetadata(userId: number, fileId: number): Promise<File> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }
    return file;
  }
}
