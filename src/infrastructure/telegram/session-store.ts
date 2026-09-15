import crypto from 'crypto';
import type { Client } from '@libsql/client';
import { StringSession } from 'telegram/sessions/index.js';

export class SessionStore {
  private db: Client | null;
  private encryptionKey: Buffer;
  private userId: number;
  private memBuffer: string = '';

  constructor(db: Client | null, encryptionKey: Buffer, userId: number = 0) {
    this.db = db;
    this.encryptionKey = encryptionKey;
    this.userId = userId;
  }

  public encrypt(plaintext: string): string {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, nonce);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return Buffer.concat([nonce, encrypted]).toString('base64');
  }

  public decrypt(encoded: string): string {
    const raw = Buffer.from(encoded, 'base64');
    if (raw.length < 28) {
      throw new Error('Ciphertext too short');
    }
    const nonce = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, nonce);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  public async getSessionString(): Promise<string> {
    if (this.userId === 0 || !this.db) {
      return this.memBuffer;
    }

    const res = await this.db.execute({
      sql: 'SELECT session_data FROM users WHERE id = ?',
      args: [this.userId],
    });
    if (!res.rows[0] || !res.rows[0].session_data) {
      return '';
    }

    try {
      return this.decrypt(String(res.rows[0].session_data));
    } catch {
      return '';
    }
  }

  public async saveSessionString(sessionString: string): Promise<void> {
    this.memBuffer = sessionString;
    if (this.userId > 0 && this.db) {
      const encrypted = this.encrypt(sessionString);
      await this.db.execute({
        sql: 'UPDATE users SET session_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [encrypted, this.userId],
      });
    }
  }

  public getEncryptedSession(): string {
    if (!this.memBuffer) {
      return '';
    }
    return this.encrypt(this.memBuffer);
  }

  public setEncryptedSession(encrypted: string): void {
    if (!encrypted) {
      this.memBuffer = '';
      return;
    }
    try {
      this.memBuffer = this.decrypt(encrypted);
    } catch {
      this.memBuffer = '';
    }
  }

  public createGramJSSession(initialString: string = ''): StringSession {
    return new StringSession(initialString || this.memBuffer);
  }
}
