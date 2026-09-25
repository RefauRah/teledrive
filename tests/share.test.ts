import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTursoClient, runTursoMigrations } from '../src/infrastructure/db/turso.js';
import { TursoShareRepository } from '../src/repository/turso-share.repository.js';
import { TursoFileRepository } from '../src/repository/turso-file.repository.js';
import { TursoFolderRepository } from '../src/repository/turso-folder.repository.js';
import { TursoUserRepository } from '../src/repository/turso-user.repository.js';
import { ShareUsecase } from '../src/usecase/share.usecase.js';
import path from 'path';

describe('Share System (Repository & Usecase)', () => {
  const db = createTursoClient(':memory:');
  let userRepo: TursoUserRepository;
  let fileRepo: TursoFileRepository;
  let folderRepo: TursoFolderRepository;
  let shareRepo: TursoShareRepository;
  let shareUC: ShareUsecase;
  let userId: number;
  let fileId: number;
  let folderId: number;

  before(async () => {
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runTursoMigrations(db, migrationsDir);

    userRepo = new TursoUserRepository(db);
    fileRepo = new TursoFileRepository(db);
    folderRepo = new TursoFolderRepository(db);
    shareRepo = new TursoShareRepository(db);

    const mockPool: any = {
      getClient: async () => ({}),
    };
    const mockDownloader: any = {
      downloadFile: async () => {},
    };

    shareUC = new ShareUsecase(shareRepo, fileRepo, folderRepo, userRepo, mockPool, mockDownloader);

    const user = await userRepo.create({
      telegram_id: '12345678',
      phone: '+6289999999',
      username: 'reza_share',
      first_name: 'Reza',
      last_name: 'Share',
      session_data: 'encrypted_session_data',
    });
    userId = user.id;

    const folder = await folderRepo.create({
      user_id: userId,
      name: 'Shared Folder',
      parent_id: null,
    });
    folderId = folder.id;

    const file = await fileRepo.create({
      user_id: userId,
      folder_id: folderId,
      name: 'document.pdf',
      size: 1024,
      mime_type: 'application/pdf',
      telegram_message_id: 101,
      telegram_chat_id: '12345678',
      telegram_file_id: 'doc123',
    });
    fileId = file.id;
  });

  after(async () => {
    db.close();
  });

  it('should create a public share link for a file', async () => {
    const share = await shareUC.createShare(userId, {
      fileId,
      expiresInDays: 7,
      maxDownloads: 50,
    });

    assert.ok(share.id);
    assert.equal(share.user_id, userId);
    assert.equal(share.file_id, fileId);
    assert.ok(share.share_token);
    assert.equal(share.max_downloads, 50);
    assert.equal(share.download_count, 0);
    assert.equal(share.is_active, true);
    assert.ok(share.expires_at);
  });

  it('should get public file metadata by token without password', async () => {
    const share = await shareUC.createShare(userId, {
      fileId,
    });

    const info = await shareUC.getShareByToken(share.share_token);
    assert.equal(info.type, 'file');
    assert.equal(info.isPasswordProtected, false);
    assert.equal(info.isAuthorized, true);
    assert.equal(info.ownerName, 'Reza Share');
    assert.equal(info.item?.name, 'document.pdf');
    assert.equal(info.item?.size, 1024);
  });

  it('should handle password-protected share link correctly', async () => {
    const share = await shareUC.createShare(userId, {
      fileId,
      password: 'mypassword123',
    });

    // 1. Without password: info shows password protected
    const unauthInfo = await shareUC.getShareByToken(share.share_token);
    assert.equal(unauthInfo.isPasswordProtected, true);
    assert.equal(unauthInfo.isAuthorized, false);
    assert.equal(unauthInfo.item, null);

    // 2. With wrong password: throws error
    await assert.rejects(
      async () => {
        await shareUC.getShareByToken(share.share_token, 'wrongpassword');
      },
      /kata sandi salah/i
    );

    // 3. With correct password: returns item details
    const authInfo = await shareUC.getShareByToken(share.share_token, 'mypassword123');
    assert.equal(authInfo.isAuthorized, true);
    assert.equal(authInfo.item?.name, 'document.pdf');
  });

  it('should share folder and list contents to visitors', async () => {
    const share = await shareUC.createShare(userId, {
      folderId,
    });

    const info = await shareUC.getShareByToken(share.share_token);
    assert.equal(info.type, 'folder');
    assert.equal(info.item?.name, 'Shared Folder');
    assert.ok(Array.isArray(info.item?.files));
    assert.equal(info.item?.files?.length, 1);
    assert.equal(info.item?.files?.[0].name, 'document.pdf');
  });

  it('should list and revoke user shares', async () => {
    const shares = await shareUC.listUserShares(userId);
    assert.ok(shares.length >= 3);

    const shareToRevoke = shares[0];
    await shareUC.revokeShare(userId, shareToRevoke.id);

    await assert.rejects(
      async () => {
        await shareUC.getShareByToken(shareToRevoke.share_token);
      },
      /tidak ditemukan/i
    );
  });
});
