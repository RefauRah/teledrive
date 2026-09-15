import mime from 'mime-types';
import type { Readable, Writable } from 'stream';
import type { File, FileRepository } from '../domain/file.js';
import type { UserRepository } from '../domain/user.js';
import type { ClientPool } from '../infrastructure/telegram/client-pool.js';
import type { Uploader } from '../infrastructure/telegram/uploader.js';
import type { Downloader } from '../infrastructure/telegram/downloader.js';

export interface DownloadResult {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export class StreamUsecase {
  private fileRepo: FileRepository;
  private userRepo: UserRepository;
  private clientPool: ClientPool;
  private uploader: Uploader;
  private downloader: Downloader;

  constructor(
    fileRepo: FileRepository,
    userRepo: UserRepository,
    clientPool: ClientPool,
    uploader: Uploader,
    downloader: Downloader
  ) {
    this.fileRepo = fileRepo;
    this.userRepo = userRepo;
    this.clientPool = clientPool;
    this.uploader = uploader;
    this.downloader = downloader;
  }

  public async upload(
    userId: number,
    folderId: number | null,
    fileName: string,
    fileSize: number,
    reader: Readable | Buffer
  ): Promise<File> {
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
