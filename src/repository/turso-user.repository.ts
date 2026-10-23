import type { Client } from '@libsql/client';
import type { User, UserRepository, ListUsersOptions } from '../domain/user.js';

export class TursoUserRepository implements UserRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'role' | 'is_banned'> & {
    role?: 'user' | 'admin';
    is_banned?: boolean;
    password_hash?: string | null;
    storage_quota_bytes?: number | null;
  }): Promise<User> {
    const role = user.role || 'user';
    const isBanned = user.is_banned ? 1 : 0;
    const passwordHash = user.password_hash || null;
    const storageQuota = user.storage_quota_bytes !== undefined ? user.storage_quota_bytes : null;

    const query = `
      INSERT INTO users (telegram_id, phone, username, first_name, last_name, photo_url, session_data, role, password_hash, is_banned, storage_quota_bytes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, telegram_id, phone, username, first_name, last_name, photo_url, session_data, role, password_hash, is_banned, storage_quota_bytes, vault_pin, created_at, updated_at
    `;
    const res = await this.db.execute({
      sql: query,
      args: [
        user.telegram_id,
        user.phone,
        user.username || '',
        user.first_name || '',
        user.last_name || '',
        user.photo_url || '',
        user.session_data || '',
        role,
        passwordHash,
        isBanned,
        storageQuota,
      ],
    });

    return this.mapRow(res.rows[0]);
  }

  public async getById(id: number): Promise<User | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByTelegramId(telegramId: string): Promise<User | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE telegram_id = ?',
      args: [telegramId],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByPhone(phone: string): Promise<User | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE phone = ?',
      args: [phone],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByUsername(username: string): Promise<User | null> {
    const cleanUsername = username.trim().replace(/^@/, '');
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1',
      args: [cleanUsername],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listAll(options: ListUsersOptions = {}): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const args: any[] = [];

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push('(username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)');
      args.push(term, term, term, term);
    }

    if (options.role) {
      conditions.push('role = ?');
      args.push(options.role);
    }

    if (options.isBanned !== undefined) {
      conditions.push('is_banned = ?');
      args.push(options.isBanned ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countRes = await this.db.execute({
      sql: `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      args: [...args],
    });
    const total = Number(countRes.rows[0]?.total || 0);

    // Get paginated list
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const listRes = await this.db.execute({
      sql: `SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    return {
      users: listRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  public async updateSession(userId: number, sessionData: string): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET session_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sessionData, userId],
    });
  }

  public async update(user: Pick<User, 'id' | 'first_name' | 'last_name' | 'phone' | 'photo_url'>): Promise<void> {
    const query = `
      UPDATE users
      SET first_name = ?, last_name = ?, phone = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this.db.execute({
      sql: query,
      args: [
        user.first_name,
        user.last_name,
        user.phone,
        user.photo_url,
        user.id,
      ],
    });
  }

  public async updateRole(userId: number, role: 'user' | 'admin'): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [role, userId],
    });
  }

  public async updateBanStatus(userId: number, isBanned: boolean): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [isBanned ? 1 : 0, userId],
    });
  }

  public async updateQuota(userId: number, quotaBytes: number | null): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET storage_quota_bytes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [quotaBytes, userId],
    });
  }

  public async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [passwordHash, userId],
    });
  }

  public async setVaultPin(userId: number, pinHash: string | null): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE users SET vault_pin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [pinHash, userId],
    });
  }

  public async deleteUser(userId: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId],
    });
  }

  public async ensureDefaultAdmin(): Promise<User> {
    const existing = await this.getByUsername('admin');
    if (existing) {
      if (existing.role !== 'admin') {
        await this.updateRole(existing.id, 'admin');
        existing.role = 'admin';
      }
      return existing;
    }

    const defaultAdminHash = 'c83a1b02d847169ef37248e9d1234567:c4eba084fc7bd3b7d636812465bb1be78e94d12c402565e733f144511c2efc0f262084a88bb16d4c687c4a928c2ba81f8771d0ca24e90d422324831392a56273';
    return await this.create({
      telegram_id: '0',
      phone: '+62000000000',
      username: 'admin',
      first_name: 'Super',
      last_name: 'Admin',
      photo_url: '',
      session_data: '',
      role: 'admin',
      password_hash: defaultAdminHash,
      is_banned: false,
      storage_quota_bytes: null,
    });
  }

  private mapRow(row: any): User {
    return {
      id: Number(row.id),
      telegram_id: String(row.telegram_id),
      phone: String(row.phone),
      username: String(row.username || ''),
      first_name: String(row.first_name || ''),
      last_name: String(row.last_name || ''),
      photo_url: String(row.photo_url || ''),
      role: (row.role as 'user' | 'admin') || 'user',
      password_hash: row.password_hash ? String(row.password_hash) : null,
      is_banned: Boolean(row.is_banned),
      storage_quota_bytes: row.storage_quota_bytes !== null && row.storage_quota_bytes !== undefined ? Number(row.storage_quota_bytes) : null,
      session_data: String(row.session_data || ''),
      vault_pin: row.vault_pin ? String(row.vault_pin) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
