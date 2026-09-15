import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createClient, type Client } from '@libsql/client';
import { runTursoMigrations } from '../src/infrastructure/db/turso.js';
import { TursoUserRepository } from '../src/repository/turso-user.repository.js';
import { TursoAuthRepository } from '../src/repository/turso-auth.repository.js';
import { TursoFolderRepository } from '../src/repository/turso-folder.repository.js';
import { TursoFileRepository } from '../src/repository/turso-file.repository.js';

describe('Turso Repositories & Migrations', () => {
  let db: Client;
  let userRepo: TursoUserRepository;
  let authRepo: TursoAuthRepository;
  let folderRepo: TursoFolderRepository;
  let fileRepo: TursoFileRepository;

  before(async () => {
    // In-memory Turso / SQLite client
    db = createClient({
      url: 'file::memory:',
    });

    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runTursoMigrations(db, migrationsDir);

    userRepo = new TursoUserRepository(db);
    authRepo = new TursoAuthRepository(db);
    folderRepo = new TursoFolderRepository(db);
    fileRepo = new TursoFileRepository(db);
  });

  after(() => {
    if (db) {
      db.close();
    }
  });

  it('should create and retrieve users', async () => {
    const user = await userRepo.create({
      telegram_id: '987654321',
      phone: '+628123456789',
      username: 'testuser',
      first_name: 'John',
      last_name: 'Doe',
      photo_url: 'https://example.com/photo.jpg',
      session_data: 'encrypted_session_data',
    });

    assert.ok(user.id > 0);
    assert.equal(user.telegram_id, '987654321');
    assert.equal(user.first_name, 'John');

    const byId = await userRepo.getById(user.id);
    assert.ok(byId);
    assert.equal(byId?.username, 'testuser');

    const byTgId = await userRepo.getByTelegramId('987654321');
    assert.ok(byTgId);
    assert.equal(byTgId?.phone, '+628123456789');

    const byPhone = await userRepo.getByPhone('+628123456789');
    assert.ok(byPhone);
    assert.equal(byPhone?.id, user.id);

    await userRepo.update({
      id: user.id,
      first_name: 'Jane',
      last_name: 'Doe',
      phone: '+628123456789',
      photo_url: '',
    });

    const updated = await userRepo.getById(user.id);
    assert.equal(updated?.first_name, 'Jane');
  });

  it('should handle auth transactions CRUD', async () => {
    await authRepo.create({
      id: 'tx-123',
      phone: '+628111111111',
      phone_code_hash: 'hash_abc',
    });

    const tx = await authRepo.getById('tx-123');
    assert.ok(tx);
    assert.equal(tx?.phone, '+628111111111');
    assert.equal(tx?.phone_code_hash, 'hash_abc');

    await authRepo.delete('tx-123');
    const deleted = await authRepo.getById('tx-123');
    assert.equal(deleted, null);
  });

  it('should handle folders, breadcrumbs, soft delete, and star', async () => {
    const rootFolder = await folderRepo.create({
      user_id: 1,
      name: 'RootFolder',
      parent_id: null,
    });
    assert.ok(rootFolder.id > 0);
    assert.equal(rootFolder.parent_id, null);

    const childFolder = await folderRepo.create({
      user_id: 1,
      name: 'ChildFolder',
      parent_id: rootFolder.id,
    });
    assert.equal(childFolder.parent_id, rootFolder.id);

    // List by parent
    const rootChildren = await folderRepo.listByParent(1, rootFolder.id);
    assert.equal(rootChildren.length, 1);
    assert.equal(rootChildren[0].name, 'ChildFolder');

    // Breadcrumbs
    const breadcrumbs = await folderRepo.getBreadcrumb(childFolder.id, 1);
    assert.equal(breadcrumbs.length, 2);
    assert.equal(breadcrumbs[0].name, 'RootFolder');
    assert.equal(breadcrumbs[1].name, 'ChildFolder');

    // Star
    await folderRepo.update({
      id: childFolder.id,
      name: childFolder.name,
      parent_id: childFolder.parent_id,
      is_starred: true,
    });
    const starred = await folderRepo.listStarred(1);
    assert.equal(starred.length, 1);
    assert.equal(starred[0].name, 'ChildFolder');

    // Soft delete & restore
    await folderRepo.softDelete(childFolder.id);
    const trashed = await folderRepo.listTrashed(1);
    assert.equal(trashed.length, 1);

    await folderRepo.restore(childFolder.id);
    const trashedAfter = await folderRepo.listTrashed(1);
    assert.equal(trashedAfter.length, 0);
  });

  it('should handle files CRUD, star, and trash', async () => {
    const file = await fileRepo.create({
      user_id: 1,
      folder_id: null,
      name: 'document.pdf',
      size: 2048,
      mime_type: 'application/pdf',
      telegram_message_id: 42,
      telegram_chat_id: '999',
      telegram_file_id: 'tg_file_42',
    });

    assert.ok(file.id > 0);
    assert.equal(file.name, 'document.pdf');
    assert.equal(file.size, 2048);

    const byId = await fileRepo.getById(file.id);
    assert.ok(byId);
    assert.equal(byId?.telegram_message_id, 42);

    // Star
    await fileRepo.update({
      id: file.id,
      name: 'document_renamed.pdf',
      folder_id: null,
      is_starred: true,
    });
    const starred = await fileRepo.listStarred(1);
    assert.equal(starred.length, 1);
    assert.equal(starred[0].name, 'document_renamed.pdf');

    // Caption & List All
    await fileRepo.updateCaption(file.id, 'Liburan ke pantai bersama keluarga');
    const withCaption = await fileRepo.getById(file.id);
    assert.equal(withCaption?.caption, 'Liburan ke pantai bersama keluarga');

    const allFiles = await fileRepo.listAll(1);
    assert.equal(allFiles.length, 1);
    assert.equal(allFiles[0].caption, 'Liburan ke pantai bersama keluarga');

    // Soft delete & empty trash
    await fileRepo.softDelete(file.id);
    const trashed = await fileRepo.listTrashed(1);
    assert.equal(trashed.length, 1);

    await fileRepo.permanentDeleteAllTrashed(1);
    const trashedAfter = await fileRepo.listTrashed(1);
    assert.equal(trashedAfter.length, 0);
  });
});
