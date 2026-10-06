import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPhoneAllowed, isUserUnlimitedStorage, DEFAULT_STORAGE_QUOTA_BYTES, type Config } from '../src/infrastructure/config/config.js';

describe('Config & Whitelist', () => {
  it('should allow all phones when allowedPhones is empty', () => {
    const config: Config = {
      telegramApiId: 12345,
      telegramApiHash: 'hash',
      tursoDatabaseUrl: 'file:test.db',
      jwtSecret: 'secret',
      encryptionKey: Buffer.alloc(32),
      allowedPhones: [],
      unlimitedPhones: [],
      storageQuotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
      port: 8080,
    };

    assert.equal(isPhoneAllowed(config, '+628123456789'), true);
    assert.equal(isPhoneAllowed(config, '+1234567890'), true);
  });

  it('should only allow whitelisted phone numbers when allowedPhones is configured', () => {
    const config: Config = {
      telegramApiId: 12345,
      telegramApiHash: 'hash',
      tursoDatabaseUrl: 'file:test.db',
      jwtSecret: 'secret',
      encryptionKey: Buffer.alloc(32),
      allowedPhones: ['+628123456789', '+628987654321'],
      unlimitedPhones: [],
      storageQuotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
      port: 8080,
    };

    assert.equal(isPhoneAllowed(config, '+628123456789'), true);
    assert.equal(isPhoneAllowed(config, '+628987654321'), true);
    assert.equal(isPhoneAllowed(config, '+1999999999'), false);
  });

  it('should strictly limit non-whitelisted users to 10GB and whitelist unlimited users', () => {
    const config: Config = {
      telegramApiId: 12345,
      telegramApiHash: 'hash',
      tursoDatabaseUrl: 'file:test.db',
      jwtSecret: 'secret',
      encryptionKey: Buffer.alloc(32),
      allowedPhones: [],
      unlimitedPhones: ['+628999999999'],
      storageQuotaBytes: 10 * 1024 * 1024 * 1024,
      port: 8080,
    };

    assert.equal(config.storageQuotaBytes, 10737418240);
    assert.equal(isUserUnlimitedStorage(config, '+628999999999'), true);
    assert.equal(isUserUnlimitedStorage(config, '+628123456789'), false);
    assert.equal(isUserUnlimitedStorage(config, undefined), false);
  });
});
