import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPhoneAllowed, DEFAULT_STORAGE_QUOTA_BYTES, type Config } from '../src/infrastructure/config/config.js';

describe('Config & Whitelist', () => {
  it('should allow all phones when allowedPhones is empty', () => {
    const config: Config = {
      telegramApiId: 12345,
      telegramApiHash: 'hash',
      tursoDatabaseUrl: 'file:test.db',
      jwtSecret: 'secret',
      encryptionKey: Buffer.alloc(32),
      allowedPhones: [],
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
      storageQuotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
      port: 8080,
    };

    assert.equal(isPhoneAllowed(config, '+628123456789'), true);
    assert.equal(isPhoneAllowed(config, '+628987654321'), true);
    assert.equal(isPhoneAllowed(config, '+1999999999'), false);
  });

  it('should have default 10GB storage quota configured', () => {
    const config: Config = {
      telegramApiId: 12345,
      telegramApiHash: 'hash',
      tursoDatabaseUrl: 'file:test.db',
      jwtSecret: 'secret',
      encryptionKey: Buffer.alloc(32),
      allowedPhones: [],
      storageQuotaBytes: 10 * 1024 * 1024 * 1024,
      port: 8080,
    };

    assert.equal(config.storageQuotaBytes, 10737418240);
    assert.equal(DEFAULT_STORAGE_QUOTA_BYTES, 10737418240);
  });
});
