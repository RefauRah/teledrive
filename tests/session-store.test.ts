import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { SessionStore } from '../src/infrastructure/telegram/session-store.js';

describe('SessionStore (AES-256-GCM)', () => {
  const keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const encryptionKey = Buffer.from(keyHex, 'hex');

  it('should correctly encrypt and decrypt strings', () => {
    const store = new SessionStore(null, encryptionKey, 0);
    const secretSession = '1BQAOMTk5M2I0ZTI2Y2QwNzgxMDYyNTk0YTMyMzFjYjg3NTN';

    const encrypted = store.encrypt(secretSession);
    assert.notEqual(encrypted, secretSession);
    assert.ok(encrypted.length > 28);

    const decrypted = store.decrypt(encrypted);
    assert.equal(decrypted, secretSession);
  });

  it('should throw error when decrypting tampered data', () => {
    const store = new SessionStore(null, encryptionKey, 0);
    const encrypted = store.encrypt('valid_session');
    const buf = Buffer.from(encrypted, 'base64');
    // Tamper with one byte
    buf[15] ^= 0xff;
    const tampered = buf.toString('base64');

    assert.throws(() => {
      store.decrypt(tampered);
    });
  });

  it('should throw error when ciphertext is too short', () => {
    const store = new SessionStore(null, encryptionKey, 0);
    const short = Buffer.from('too_short').toString('base64');

    assert.throws(() => {
      store.decrypt(short);
    }, /Ciphertext too short/);
  });

  it('should handle in-memory session buffer for userId 0', async () => {
    const store = new SessionStore(null, encryptionKey, 0);
    const sample = 'temp_session_string';
    await store.saveSessionString(sample);

    const loaded = await store.getSessionString();
    assert.equal(loaded, sample);

    const encrypted = store.getEncryptedSession();
    assert.ok(encrypted.length > 0);

    const store2 = new SessionStore(null, encryptionKey, 0);
    store2.setEncryptedSession(encrypted);
    const loaded2 = await store2.getSessionString();
    assert.equal(loaded2, sample);
  });
});
