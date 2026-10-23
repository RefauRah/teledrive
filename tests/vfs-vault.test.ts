import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { createTursoClient, runTursoMigrations } from '../src/infrastructure/db/turso.js';
import { TursoUserRepository } from '../src/repository/turso-user.repository.js';
import { TursoFolderRepository } from '../src/repository/turso-folder.repository.js';
import { TursoFileRepository } from '../src/repository/turso-file.repository.js';
import { VFSUsecase } from '../src/usecase/vfs.usecase.js';
import { verifyVaultToken } from '../src/infrastructure/crypto/pin.js';

describe('Private Vault (PIN & File Privacy)', () => {
  let db: any;
  let userRepo: TursoUserRepository;
  let folderRepo: TursoFolderRepository;
  let fileRepo: TursoFileRepository;
  let vfs: VFSUsecase;
  let testUserId: number;
  const jwtSecret = 'test-vault-secret-key-123';

  beforeEach(async () => {
    db = createTursoClient('file::memory:');
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runTursoMigrations(db, migrationsDir);

    userRepo = new TursoUserRepository(db);
    folderRepo = new TursoFolderRepository(db);
    fileRepo = new TursoFileRepository(db);
    vfs = new VFSUsecase(folderRepo, fileRepo, {} as any, userRepo, jwtSecret);

    const user = await userRepo.create({
      telegram_id: '12345678',
      phone: '+628123456789',
      username: 'vaultuser',
      first_name: 'Vault',
      last_name: 'Tester',
      photo_url: '',
      session_data: '',
    });
    testUserId = user.id;
  });

  it('should initially report no PIN configured', async () => {
    const status = await vfs.getVaultStatus(testUserId);
    assert.strictEqual(status.hasPin, false);
  });

  it('should reject invalid PIN formats and setup valid PIN', async () => {
    await assert.rejects(
      () => vfs.setupVaultPin(testUserId, '12'),
      /4-8 digit/
    );
    await assert.rejects(
      () => vfs.setupVaultPin(testUserId, 'abcd'),
      /4-8 digit/
    );

    const { vaultToken } = await vfs.setupVaultPin(testUserId, '1234');
    assert.ok(vaultToken);
    assert.strictEqual(verifyVaultToken(vaultToken, testUserId, jwtSecret), true);

    const status = await vfs.getVaultStatus(testUserId);
    assert.strictEqual(status.hasPin, true);

    // Cannot setup again without change-pin
    await assert.rejects(
      () => vfs.setupVaultPin(testUserId, '9999'),
      /sudah diatur/
    );
  });

  it('should verify PIN correctly and reject incorrect PIN', async () => {
    await vfs.setupVaultPin(testUserId, '4567');

    await assert.rejects(
      () => vfs.verifyVaultPin(testUserId, '0000'),
      /salah/
    );

    const { vaultToken } = await vfs.verifyVaultPin(testUserId, '4567');
    assert.ok(vaultToken);
    assert.strictEqual(vfs.verifyVaultToken(testUserId, vaultToken), true);
  });

  it('should allow changing PIN with current PIN validation', async () => {
    await vfs.setupVaultPin(testUserId, '1111');

    await assert.rejects(
      () => vfs.changeVaultPin(testUserId, 'wrong', '2222'),
      /tidak sesuai/
    );

    await vfs.changeVaultPin(testUserId, '1111', '2222');

    // Old PIN fails
    await assert.rejects(
      () => vfs.verifyVaultPin(testUserId, '1111'),
      /salah/
    );

    // New PIN works
    const { vaultToken } = await vfs.verifyVaultPin(testUserId, '2222');
    assert.ok(vaultToken);
  });

  it('should hide locked files from regular gallery and list them in vault', async () => {
    // Create 2 normal files
    const file1 = await fileRepo.create({
      user_id: testUserId,
      folder_id: null,
      name: 'holiday.jpg',
      size: 1024,
      mime_type: 'image/jpeg',
      telegram_message_id: 100,
      telegram_chat_id: '12345678',
      telegram_file_id: 'doc1',
    });

    const file2 = await fileRepo.create({
      user_id: testUserId,
      folder_id: null,
      name: 'confidential.pdf',
      size: 2048,
      mime_type: 'application/pdf',
      telegram_message_id: 101,
      telegram_chat_id: '12345678',
      telegram_file_id: 'doc2',
    });

    // Both visible in regular listing
    let normalListing = await vfs.listDirectory(testUserId, null);
    assert.strictEqual(normalListing.files.length, 2);

    let memories = await vfs.listAllFiles(testUserId);
    assert.strictEqual(memories.length, 2);

    // Lock file2 into Vault
    await vfs.toggleVaultStatus(testUserId, [file2.id], [], true);

    // Regular gallery now only has file1!
    normalListing = await vfs.listDirectory(testUserId, null);
    assert.strictEqual(normalListing.files.length, 1);
    assert.strictEqual(normalListing.files[0].id, file1.id);

    memories = await vfs.listAllFiles(testUserId);
    assert.strictEqual(memories.length, 1);
    assert.strictEqual(memories[0].id, file1.id);

    // Vault items contains file2
    const vaultItems = await vfs.listVaultItems(testUserId);
    assert.strictEqual(vaultItems.files.length, 1);
    assert.strictEqual(vaultItems.files[0].id, file2.id);
    assert.strictEqual(vaultItems.files[0].is_vault, true);

    // Unlock file2 back to regular gallery
    await vfs.toggleVaultStatus(testUserId, [file2.id], [], false);

    normalListing = await vfs.listDirectory(testUserId, null);
    assert.strictEqual(normalListing.files.length, 2);

    const emptyVault = await vfs.listVaultItems(testUserId);
    assert.strictEqual(emptyVault.files.length, 0);
  });
});
