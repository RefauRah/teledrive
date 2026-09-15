import { Api } from 'telegram';
import type { Folder, FolderRepository, BreadcrumbItem } from '../domain/folder.js';
import type { File, FileRepository } from '../domain/file.js';
import type { ClientPool } from '../infrastructure/telegram/client-pool.js';

export interface DirectoryListing {
  folders: Folder[];
  files: File[];
}

export class VFSUsecase {
  private folderRepo: FolderRepository;
  private fileRepo: FileRepository;
  private clientPool: ClientPool;

  constructor(
    folderRepo: FolderRepository,
    fileRepo: FileRepository,
    clientPool: ClientPool
  ) {
    this.folderRepo = folderRepo;
    this.fileRepo = fileRepo;
    this.clientPool = clientPool;
  }

  public async listDirectory(userId: number, folderId: number | null): Promise<DirectoryListing> {
    const folders = await this.folderRepo.listByParent(userId, folderId);
    const files = await this.fileRepo.listByFolder(userId, folderId);

    return {
      folders,
      files,
    };
  }

  public async createFolder(userId: number, name: string, parentId: number | null): Promise<Folder> {
    if (!name || !name.trim()) {
      throw new Error('Folder name is required');
    }

    if (parentId !== null) {
      const parent = await this.folderRepo.getById(parentId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
      if (parent.user_id !== userId) {
        throw new Error('Parent folder does not belong to user');
      }
    }

    return await this.folderRepo.create({
      user_id: userId,
      name: name.trim(),
      parent_id: parentId,
    });
  }

  public async renameFolder(userId: number, folderId: number, newName: string): Promise<Folder> {
    if (!newName || !newName.trim()) {
      throw new Error('New name is required');
    }

    const folder = await this.folderRepo.getById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    if (folder.user_id !== userId) {
      throw new Error('Folder does not belong to user');
    }

    folder.name = newName.trim();
    await this.folderRepo.update({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      is_starred: folder.is_starred,
    });

    return folder;
  }

  public async renameFile(userId: number, fileId: number, newName: string): Promise<File> {
    if (!newName || !newName.trim()) {
      throw new Error('New name is required');
    }

    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    file.name = newName.trim();
    await this.fileRepo.update({
      id: file.id,
      name: file.name,
      folder_id: file.folder_id,
      is_starred: file.is_starred,
    });

    return file;
  }

  public async moveFolder(userId: number, folderId: number, newParentId: number | null): Promise<Folder> {
    const folder = await this.folderRepo.getById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    if (folder.user_id !== userId) {
      throw new Error('Folder does not belong to user');
    }

    if (newParentId !== null && newParentId === folderId) {
      throw new Error('Cannot move folder into itself');
    }

    if (newParentId !== null) {
      const parent = await this.folderRepo.getById(newParentId);
      if (!parent) {
        throw new Error('Target parent folder not found');
      }
      if (parent.user_id !== userId) {
        throw new Error('Target parent folder does not belong to user');
      }
    }

    folder.parent_id = newParentId;
    await this.folderRepo.update({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      is_starred: folder.is_starred,
    });

    return folder;
  }

  public async moveFile(userId: number, fileId: number, newFolderId: number | null): Promise<File> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    if (newFolderId !== null) {
      const folder = await this.folderRepo.getById(newFolderId);
      if (!folder) {
        throw new Error('Target folder not found');
      }
      if (folder.user_id !== userId) {
        throw new Error('Target folder does not belong to user');
      }
    }

    file.folder_id = newFolderId;
    await this.fileRepo.update({
      id: file.id,
      name: file.name,
      folder_id: file.folder_id,
      is_starred: file.is_starred,
    });

    return file;
  }

  public async deleteFolder(userId: number, folderId: number): Promise<void> {
    const folder = await this.folderRepo.getById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    if (folder.user_id !== userId) {
      throw new Error('Folder does not belong to user');
    }

    try {
      const messageIds = await this.collectFolderFileIds(userId, folderId);
      if (messageIds.length > 0) {
        const client = await this.clientPool.getClient(userId);
        await client.deleteMessages('me', messageIds, { revoke: true });
      }
    } catch (tgErr) {
      console.warn(`Failed to delete messages for folder ${folderId} from Telegram:`, tgErr);
    }

    await this.folderRepo.softDelete(folderId);
  }

  public async deleteFile(userId: number, fileId: number): Promise<void> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    // Delete message from Telegram Saved Messages
    if (file.telegram_message_id && file.telegram_message_id > 0) {
      try {
        const client = await this.clientPool.getClient(userId);
        await client.deleteMessages('me', [file.telegram_message_id], { revoke: true });
      } catch (tgErr) {
        console.warn(`Failed to delete message ${file.telegram_message_id} from Telegram:`, tgErr);
      }
    }

    await this.fileRepo.softDelete(fileId);
  }

  private async collectFolderFileIds(userId: number, folderId: number): Promise<number[]> {
    let messageIds: number[] = [];
    const directFiles = await this.fileRepo.listByFolder(userId, folderId);
    for (const f of directFiles) {
      if (f.telegram_message_id > 0) messageIds.push(f.telegram_message_id);
      await this.fileRepo.softDelete(f.id);
    }

    const childFolders = await this.folderRepo.listByParent(userId, folderId);
    for (const child of childFolders) {
      const childMsgIds = await this.collectFolderFileIds(userId, child.id);
      messageIds = messageIds.concat(childMsgIds);
      await this.folderRepo.softDelete(child.id);
    }

    return messageIds;
  }

  public async listTrash(userId: number): Promise<DirectoryListing> {
    const folders = await this.folderRepo.listTrashed(userId);
    const files = await this.fileRepo.listTrashed(userId);

    return {
      folders,
      files,
    };
  }

  public async restoreFolder(userId: number, folderId: number): Promise<void> {
    const folder = await this.folderRepo.getById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    if (folder.user_id !== userId) {
      throw new Error('Folder does not belong to user');
    }

    await this.folderRepo.restore(folderId);
  }

  public async restoreFile(userId: number, fileId: number): Promise<void> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    await this.fileRepo.restore(fileId);
  }

  public async emptyTrash(userId: number): Promise<void> {
    const trashedFiles = await this.fileRepo.listTrashed(userId);
    const messageIds = trashedFiles
      .map((f) => f.telegram_message_id)
      .filter((id) => id > 0);

    if (messageIds.length > 0) {
      try {
        const client = await this.clientPool.getClient(userId);
        const chunkSize = 100;
        for (let i = 0; i < messageIds.length; i += chunkSize) {
          const chunk = messageIds.slice(i, i + chunkSize);
          try {
            await client.invoke(
              new Api.messages.DeleteMessages({
                id: chunk,
                revoke: true,
              })
            );
          } catch (delErr) {
            console.warn(`Failed to delete messages ${chunk} from Telegram:`, delErr);
          }
        }
      } catch (clientErr) {
        console.warn(`Failed to get Telegram client to delete messages for user ${userId}:`, clientErr);
      }
    }

    await this.fileRepo.permanentDeleteAllTrashed(userId);

    const trashedFolders = await this.folderRepo.listTrashed(userId);
    for (const folder of trashedFolders) {
      await this.folderRepo.permanentDelete(folder.id);
    }
  }

  public async getBreadcrumb(userId: number, folderId: number): Promise<BreadcrumbItem[]> {
    return await this.folderRepo.getBreadcrumb(folderId, userId);
  }

  public async listStarred(userId: number): Promise<DirectoryListing> {
    const folders = await this.folderRepo.listStarred(userId);
    const files = await this.fileRepo.listStarred(userId);

    return {
      folders,
      files,
    };
  }

  public async toggleStar(userId: number, itemType: 'folder' | 'file', itemId: number): Promise<void> {
    if (itemType === 'folder') {
      const folder = await this.folderRepo.getById(itemId);
      if (!folder) {
        throw new Error('Folder not found');
      }
      if (folder.user_id !== userId) {
        throw new Error('Permission denied');
      }

      await this.folderRepo.update({
        id: folder.id,
        name: folder.name,
        parent_id: folder.parent_id,
        is_starred: !folder.is_starred,
      });
    } else if (itemType === 'file') {
      const file = await this.fileRepo.getById(itemId);
      if (!file) {
        throw new Error('File not found');
      }
      if (file.user_id !== userId) {
        throw new Error('Permission denied');
      }

      await this.fileRepo.update({
        id: file.id,
        name: file.name,
        folder_id: file.folder_id,
        is_starred: !file.is_starred,
      });
    } else {
      throw new Error(`Invalid item type: ${itemType}`);
    }
  }

  public async updateCaption(userId: number, fileId: number, caption: string): Promise<File> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    if (file.user_id !== userId) {
      throw new Error('File does not belong to user');
    }

    await this.fileRepo.updateCaption(fileId, caption);
    file.caption = caption;
    return file;
  }

  public async listAllFiles(userId: number): Promise<File[]> {
    return await this.fileRepo.listAll(userId);
  }

  public async syncWithTelegram(userId: number): Promise<{ added: number; synced: number }> {
    const client = await this.clientPool.getClient(userId);
    const messages = await client.getMessages('me', { limit: 50 });
    const existingFiles = await this.fileRepo.listAll(userId);
    const existingMsgIds = new Set(existingFiles.map((f) => f.telegram_message_id));

    let added = 0;

    for (const msg of messages) {
      if (!msg || !msg.media || existingMsgIds.has(msg.id)) continue;

      let name = '';
      let size = 0;
      let mimeType = 'application/octet-stream';
      let fileId = msg.id.toString();
      const caption = msg.message || '';

      const media: any = msg.media;

      if (media.document || media.className === 'MessageMediaDocument') {
        const doc = media.document || media;
        size = Number(doc.size || 0);
        mimeType = doc.mimeType || 'application/octet-stream';
        fileId = doc.id ? doc.id.toString() : msg.id.toString();

        const nameAttr = doc.attributes?.find(
          (a: any) => a.className === 'DocumentAttributeFilename' || a.fileName
        );
        name = nameAttr?.fileName || `file_${msg.id}`;
      } else if (media.photo || media.className === 'MessageMediaPhoto') {
        const photo = media.photo || media;
        fileId = photo.id ? photo.id.toString() : msg.id.toString();
        mimeType = 'image/jpeg';
        name = `photo_${msg.id}.jpg`;
        const largest = photo.sizes?.[photo.sizes.length - 1];
        size = largest?.size || 1024 * 200;
      } else {
        continue;
      }

      let chatId = '0';
      if (msg.peerId) {
        const peer: any = msg.peerId;
        if (peer.userId) chatId = peer.userId.toString();
        else if (peer.channelId) chatId = peer.channelId.toString();
        else if (peer.chatId) chatId = peer.chatId.toString();
      }

      await this.fileRepo.create({
        user_id: userId,
        folder_id: null,
        name,
        size,
        mime_type: mimeType,
        telegram_message_id: msg.id,
        telegram_chat_id: chatId,
        telegram_file_id: fileId,
        caption,
      });

      added++;
    }

    return {
      added,
      synced: existingFiles.length + added,
    };
  }
}
