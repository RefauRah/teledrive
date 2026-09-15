import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VFSUsecase } from '../src/usecase/vfs.usecase.js';
import type { Folder, FolderRepository, BreadcrumbItem } from '../src/domain/folder.js';
import type { File, FileRepository } from '../src/domain/file.js';

class MockFolderRepository implements FolderRepository {
  public folders: Folder[] = [];
  private nextId = 1;

  public async create(folder: { user_id: number; name: string; parent_id: number | null }): Promise<Folder> {
    const newFolder: Folder = {
      id: this.nextId++,
      user_id: folder.user_id,
      name: folder.name,
      parent_id: folder.parent_id,
      is_starred: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.folders.push(newFolder);
    return newFolder;
  }

  public async getById(id: number): Promise<Folder | null> {
    return this.folders.find((f) => f.id === id) || null;
  }

  public async listByParent(userId: number, parentId: number | null): Promise<Folder[]> {
    return this.folders.filter(
      (f) => f.user_id === userId && f.parent_id === parentId && !f.deleted_at
    );
  }

  public async update(folder: Pick<Folder, 'id' | 'name' | 'parent_id' | 'is_starred'>): Promise<void> {
    const existing = this.folders.find((f) => f.id === folder.id);
    if (existing) {
      existing.name = folder.name;
      existing.parent_id = folder.parent_id;
      existing.is_starred = folder.is_starred;
      existing.updated_at = new Date();
    }
  }

  public async softDelete(id: number): Promise<void> {
    const existing = this.folders.find((f) => f.id === id);
    if (existing) {
      existing.deleted_at = new Date();
    }
  }

  public async restore(id: number): Promise<void> {
    const existing = this.folders.find((f) => f.id === id);
    if (existing) {
      existing.deleted_at = null;
    }
  }

  public async listTrashed(userId: number): Promise<Folder[]> {
    return this.folders.filter((f) => f.user_id === userId && f.deleted_at);
  }

  public async permanentDelete(id: number): Promise<void> {
    this.folders = this.folders.filter((f) => f.id !== id);
  }

  public async getBreadcrumb(folderId: number, userId: number): Promise<BreadcrumbItem[]> {
    const trail: BreadcrumbItem[] = [];
    let currentId: number | null = folderId;

    while (currentId !== null) {
      const folder = this.folders.find((f) => f.id === currentId && f.user_id === userId);
      if (!folder) break;
      trail.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id;
    }
    return trail;
  }

  public async listStarred(userId: number): Promise<Folder[]> {
    return this.folders.filter((f) => f.user_id === userId && f.is_starred && !f.deleted_at);
  }
}

class MockFileRepository implements FileRepository {
  public files: File[] = [];
  private nextId = 1;

  public async create(file: {
    user_id: number;
    folder_id: number | null;
    name: string;
    size: number;
    mime_type: string;
    telegram_message_id: number;
    telegram_chat_id: string;
    telegram_file_id: string;
  }): Promise<File> {
    const newFile: File = {
      id: this.nextId++,
      user_id: file.user_id,
      folder_id: file.folder_id,
      name: file.name,
      size: file.size,
      mime_type: file.mime_type,
      telegram_message_id: file.telegram_message_id,
      telegram_chat_id: file.telegram_chat_id,
      telegram_file_id: file.telegram_file_id,
      is_starred: false,
      caption: file.caption || '',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.files.push(newFile);
    return newFile;
  }

  public async getById(id: number): Promise<File | null> {
    return this.files.find((f) => f.id === id) || null;
  }

  public async listByFolder(userId: number, folderId: number | null): Promise<File[]> {
    return this.files.filter(
      (f) => f.user_id === userId && f.folder_id === folderId && !f.deleted_at
    );
  }

  public async update(file: Pick<File, 'id' | 'name' | 'folder_id' | 'is_starred'>): Promise<void> {
    const existing = this.files.find((f) => f.id === file.id);
    if (existing) {
      existing.name = file.name;
      existing.folder_id = file.folder_id;
      existing.is_starred = file.is_starred;
      existing.updated_at = new Date();
    }
  }

  public async softDelete(id: number): Promise<void> {
    const existing = this.files.find((f) => f.id === id);
    if (existing) {
      existing.deleted_at = new Date();
    }
  }

  public async restore(id: number): Promise<void> {
    const existing = this.files.find((f) => f.id === id);
    if (existing) {
      existing.deleted_at = null;
    }
  }

  public async listTrashed(userId: number): Promise<File[]> {
    return this.files.filter((f) => f.user_id === userId && f.deleted_at);
  }

  public async permanentDelete(id: number): Promise<void> {
    this.files = this.files.filter((f) => f.id !== id);
  }

  public async permanentDeleteAllTrashed(userId: number): Promise<void> {
    this.files = this.files.filter((f) => !(f.user_id === userId && f.deleted_at));
  }

  public async updateCaption(id: number, caption: string): Promise<void> {
    const existing = this.files.find((f) => f.id === id);
    if (existing) {
      existing.caption = caption;
      existing.updated_at = new Date();
    }
  }

  public async listStarred(userId: number): Promise<File[]> {
    return this.files.filter((f) => f.user_id === userId && f.is_starred && !f.deleted_at);
  }

  public async listAll(userId: number): Promise<File[]> {
    return this.files.filter((f) => f.user_id === userId && !f.deleted_at);
  }
}

describe('VFSUsecase', () => {
  let folderRepo: MockFolderRepository;
  let fileRepo: MockFileRepository;
  let vfs: VFSUsecase;

  beforeEach(() => {
    folderRepo = new MockFolderRepository();
    fileRepo = new MockFileRepository();
    vfs = new VFSUsecase(folderRepo, fileRepo, {} as any);
  });

  it('should create and list folders and files in root directory', async () => {
    const folder = await vfs.createFolder(1, 'Documents', null);
    assert.equal(folder.name, 'Documents');
    assert.equal(folder.parent_id, null);

    await fileRepo.create({
      user_id: 1,
      folder_id: null,
      name: 'notes.txt',
      size: 1024,
      mime_type: 'text/plain',
      telegram_message_id: 100,
      telegram_chat_id: '123',
      telegram_file_id: 'file_1',
    });

    const listing = await vfs.listDirectory(1, null);
    assert.equal(listing.folders.length, 1);
    assert.equal(listing.folders[0].name, 'Documents');
    assert.equal(listing.files.length, 1);
    assert.equal(listing.files[0].name, 'notes.txt');
  });

  it('should prevent moving a folder into itself', async () => {
    const folder = await vfs.createFolder(1, 'FolderA', null);
    await assert.rejects(
      async () => {
        await vfs.moveFolder(1, folder.id, folder.id);
      },
      /Cannot move folder into itself/
    );
  });

  it('should rename folder and file', async () => {
    const folder = await vfs.createFolder(1, 'OldName', null);
    const renamed = await vfs.renameFolder(1, folder.id, 'NewName');
    assert.equal(renamed.name, 'NewName');

    const file = await fileRepo.create({
      user_id: 1,
      folder_id: null,
      name: 'old.txt',
      size: 100,
      mime_type: 'text/plain',
      telegram_message_id: 1,
      telegram_chat_id: '1',
      telegram_file_id: 'f1',
    });
    const renamedFile = await vfs.renameFile(1, file.id, 'new.txt');
    assert.equal(renamedFile.name, 'new.txt');
  });

  it('should soft delete, list trash, and restore items', async () => {
    const folder = await vfs.createFolder(1, 'ToTrash', null);
    await vfs.deleteFolder(1, folder.id);

    let trash = await vfs.listTrash(1);
    assert.equal(trash.folders.length, 1);

    await vfs.restoreFolder(1, folder.id);
    trash = await vfs.listTrash(1);
    assert.equal(trash.folders.length, 0);

    const normalListing = await vfs.listDirectory(1, null);
    assert.equal(normalListing.folders.length, 1);
  });

  it('should toggle star on folder and file', async () => {
    const folder = await vfs.createFolder(1, 'StarFolder', null);
    assert.equal(folder.is_starred, false);

    await vfs.toggleStar(1, 'folder', folder.id);
    let starred = await vfs.listStarred(1);
    assert.equal(starred.folders.length, 1);
    assert.equal(starred.folders[0].name, 'StarFolder');

    await vfs.toggleStar(1, 'folder', folder.id);
    starred = await vfs.listStarred(1);
    assert.equal(starred.folders.length, 0);
  });

  it('should update caption and list all files as memories', async () => {
    const file = await fileRepo.create({
      user_id: 1,
      folder_id: null,
      name: 'sunset.jpg',
      size: 500,
      mime_type: 'image/jpeg',
      telegram_message_id: 200,
      telegram_chat_id: '123',
      telegram_file_id: 'file_sunset',
    });

    const updated = await vfs.updateCaption(1, file.id, 'Sunset indah di Bali');
    assert.equal(updated.caption, 'Sunset indah di Bali');

    const memories = await vfs.listAllFiles(1);
    assert.ok(memories.some((m) => m.id === file.id && m.caption === 'Sunset indah di Bali'));
  });
});
