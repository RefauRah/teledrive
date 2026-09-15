import type { Client } from '@libsql/client';
import type { User, UserRepository } from '../domain/user.js';

export class TursoUserRepository implements UserRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const query = `
      INSERT INTO users (telegram_id, phone, username, first_name, last_name, photo_url, session_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, telegram_id, phone, username, first_name, last_name, photo_url, session_data, created_at, updated_at
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

  private mapRow(row: any): User {
    return {
      id: Number(row.id),
      telegram_id: String(row.telegram_id),
      phone: String(row.phone),
      username: String(row.username || ''),
      first_name: String(row.first_name || ''),
      last_name: String(row.last_name || ''),
      photo_url: String(row.photo_url || ''),
      session_data: String(row.session_data || ''),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
