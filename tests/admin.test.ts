import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createClient, type Client } from '@libsql/client';
import { runTursoMigrations } from '../src/infrastructure/db/turso.js';
import { TursoUserRepository } from '../src/repository/turso-user.repository.js';
import { TursoFolderRepository } from '../src/repository/turso-folder.repository.js';
import { TursoFileRepository } from '../src/repository/turso-file.repository.js';
import { TursoAuthRepository } from '../src/repository/turso-auth.repository.js';
import { TursoShareRepository } from '../src/repository/turso-share.repository.js';
import { AuthUsecase } from '../src/usecase/auth.usecase.js';
import { AdminUsecase } from '../src/usecase/admin.usecase.js';
import type { Config } from '../infrastructure/config/config.js';
import { verifyPassword } from '../src/infrastructure/crypto/password.js';

describe('Admin System & Default Account', () => {
  let db: Client;
  let userRepo: TursoUserRepository;
  let folderRepo: TursoFolderRepository;
  let fileRepo: TursoFileRepository;
  let authRepo: TursoAuthRepository;
  let shareRepo: TursoShareRepository;
  let authUC: AuthUsecase;
  let adminUC: AdminUsecase;

  const mockConfig: Config = {
    telegramApiId: 12345,
    telegramApiHash: 'mock-hash',
    tursoDatabaseUrl: 'file::memory:',
    tursoAuthToken: '',
    jwtSecret: 'super-secret-admin-test-jwt-token',
    encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    allowedPhones: [],
    storageQuotaBytes: 10 * 1024 * 1024 * 1024,
    port: 8080,
  };

  const mockClientPool: any = {
    startTempClient: async () => ({}),
    promoteTempClientToActive: () => {},
    getClient: async () => ({}),
    close: async () => {},
  };

  before(async () => {
    db = createClient({ url: 'file::memory:' });
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runTursoMigrations(db, migrationsDir);

    userRepo = new TursoUserRepository(db);
    folderRepo = new TursoFolderRepository(db);
    fileRepo = new TursoFileRepository(db);
    authRepo = new TursoAuthRepository(db);
    shareRepo = new TursoShareRepository(db);

    authUC = new AuthUsecase(authRepo, userRepo, mockConfig, mockClientPool);
    adminUC = new AdminUsecase(userRepo, fileRepo, folderRepo, shareRepo, mockConfig);
  });

  after(() => {
    if (db) db.close();
  });

  it('should have seeded the default admin account with correct credentials', async () => {
    const adminUser = await userRepo.ensureDefaultAdmin();
    assert.ok(adminUser);
    assert.equal(adminUser.username, 'admin');
    assert.equal(adminUser.role, 'admin');
    assert.equal(adminUser.is_banned, false);
    assert.ok(adminUser.password_hash);

    // Verify default password 'admin123'
    const isPassValid = verifyPassword('admin123', adminUser.password_hash!);
    assert.equal(isPassValid, true);
  });

  it('should authenticate default admin with password and issue admin JWT token', async () => {
    const loginResult = await authUC.loginWithPassword('admin', 'admin123');
    assert.ok(loginResult.token);
    assert.equal(loginResult.user.username, 'admin');
    assert.equal(loginResult.user.role, 'admin');

    // Should reject invalid password
    await assert.rejects(
      async () => {
        await authUC.loginWithPassword('admin', 'wrongpassword');
      },
      /Username atau kata sandi salah/
    );
  });

  it('should retrieve overall system statistics', async () => {
    // Create a regular user
    const regularUser = await userRepo.create({
      telegram_id: '12345678',
      phone: '+628111222333',
      username: 'johndoe',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
    });

    // Create a file
    await fileRepo.create({
      user_id: regularUser.id,
      folder_id: null,
      name: 'photo.jpg',
      size: 5 * 1024 * 1024,
      mime_type: 'image/jpeg',
      telegram_message_id: 101,
      telegram_chat_id: '12345',
      telegram_file_id: 'tg-file-photo',
    });

    const stats = await adminUC.getSystemStats();
    assert.ok(stats.totalUsers >= 2);
    assert.ok(stats.adminUsers >= 1);
    assert.ok(stats.totalFiles >= 1);
    assert.equal(stats.breakdown.image.count, 1);
    assert.equal(stats.breakdown.image.bytes, 5 * 1024 * 1024);
    assert.equal(stats.health.status, 'healthy');
  });

  it('should manage users: toggle role, ban status, and prevent self-demotion', async () => {
    const admin = await userRepo.getByUsername('admin');
    assert.ok(admin);

    const user = await userRepo.getByUsername('johndoe');
    assert.ok(user);

    // Promote user to admin
    await adminUC.updateUserRole(admin!.id, user!.id, 'admin');
    const updatedUser = await userRepo.getById(user!.id);
    assert.equal(updatedUser?.role, 'admin');

    // Ban user
    await adminUC.updateUserBanStatus(admin!.id, user!.id, true);
    const bannedUser = await userRepo.getById(user!.id);
    assert.equal(bannedUser?.is_banned, true);

    // Prevent self-ban
    await assert.rejects(
      async () => {
        await adminUC.updateUserBanStatus(admin!.id, admin!.id, true);
      },
      /tidak dapat menonaktifkan akun Anda sendiri/
    );

    // Prevent self-demotion
    await assert.rejects(
      async () => {
        await adminUC.updateUserRole(admin!.id, admin!.id, 'user');
      },
      /tidak dapat mencabut hak akses administrator/
    );
  });

  it('should list files system-wide and allow admin to delete files', async () => {
    const listRes = await adminUC.listFiles();
    assert.ok(listRes.files.length >= 1);
    const testFile = listRes.files[0];
    assert.equal(testFile.name, 'photo.jpg');
    assert.ok(testFile.owner_username);

    // Admin deletes the file
    await adminUC.deleteFile(testFile.id);
    const checkFile = await fileRepo.getById(testFile.id);
    assert.equal(checkFile, null);
  });
});
