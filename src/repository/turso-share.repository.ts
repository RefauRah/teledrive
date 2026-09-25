import type { Client } from '@libsql/client';
import type { Share, ShareRepository, CreateShareParams } from '../domain/share.js';

export class TursoShareRepository implements ShareRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(params: CreateShareParams): Promise<Share> {
    const query = `
      INSERT INTO shares (
        user_id, folder_id, file_id, share_token, password_hash, expires_at, max_downloads, download_count, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, folder_id, file_id, share_token, password_hash, expires_at, max_downloads, download_count, is_active, created_at, updated_at
    `;
    const res = await this.db.execute({
      sql: query,
      args: [
        params.user_id,
        params.folder_id ?? null,
        params.file_id ?? null,
        params.share_token,
        params.password_hash ?? null,
        params.expires_at ? params.expires_at.toISOString() : null,
        params.max_downloads ?? null,
      ],
    });
    return this.mapRow(res.rows[0]);
  }

  public async getById(id: number): Promise<Share | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM shares WHERE id = ?',
      args: [id],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByToken(token: string): Promise<Share | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM shares WHERE share_token = ?',
      args: [token],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByFileId(userId: number, fileId: number): Promise<Share | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM shares WHERE user_id = ? AND file_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      args: [userId, fileId],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async getByFolderId(userId: number, folderId: number): Promise<Share | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM shares WHERE user_id = ? AND folder_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      args: [userId, folderId],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listByUser(userId: number): Promise<Share[]> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM shares WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async incrementDownloadCount(id: number): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE shares SET download_count = download_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  }

  public async updateStatus(id: number, isActive: boolean): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE shares SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [isActive ? 1 : 0, id],
    });
  }

  public async delete(id: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM shares WHERE id = ?',
      args: [id],
    });
  }

  private mapRow(row: any): Share {
    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      file_id: row.file_id !== null && row.file_id !== undefined ? Number(row.file_id) : null,
      folder_id: row.folder_id !== null && row.folder_id !== undefined ? Number(row.folder_id) : null,
      share_token: String(row.share_token),
      password_hash: row.password_hash ? String(row.password_hash) : null,
      expires_at: row.expires_at ? new Date(row.expires_at) : null,
      max_downloads: row.max_downloads !== null && row.max_downloads !== undefined ? Number(row.max_downloads) : null,
      download_count: Number(row.download_count || 0),
      is_active: Number(row.is_active) === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
