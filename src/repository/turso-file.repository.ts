import type { Client } from '@libsql/client';
import type { File, FileRepository } from '../domain/file.js';

export class TursoFileRepository implements FileRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(file: {
    user_id: number;
    folder_id: number | null;
    name: string;
    size: number;
    mime_type: string;
    telegram_message_id: number;
    telegram_chat_id: string;
    telegram_file_id: string;
    caption?: string;
  }): Promise<File> {
    const query = `
      INSERT INTO files (user_id, folder_id, name, size, mime_type, telegram_message_id, telegram_chat_id, telegram_file_id, caption, is_starred, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, folder_id, name, size, mime_type, telegram_message_id, telegram_chat_id, telegram_file_id, caption, is_starred, deleted_at, created_at, updated_at
    `;
    const res = await this.db.execute({
      sql: query,
      args: [
        file.user_id,
        file.folder_id,
        file.name,
        file.size,
        file.mime_type,
        file.telegram_message_id,
        file.telegram_chat_id,
        file.telegram_file_id,
        file.caption || '',
      ],
    });
    return this.mapRow(res.rows[0]);
  }

  public async getById(id: number): Promise<File | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM files WHERE id = ?',
      args: [id],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listByFolder(userId: number, folderId: number | null): Promise<File[]> {
    let sql: string;
    let args: any[];

    if (folderId === null) {
      sql = 'SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL AND deleted_at IS NULL ORDER BY created_at DESC';
      args = [userId];
    } else {
      sql = 'SELECT * FROM files WHERE user_id = ? AND folder_id = ? AND deleted_at IS NULL ORDER BY created_at DESC';
      args = [userId, folderId];
    }

    const res = await this.db.execute({ sql, args });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async listAll(userId: number): Promise<File[]> {
    const sql = `
      SELECT f.* FROM files f
      LEFT JOIN folders fold ON f.folder_id = fold.id
      WHERE f.user_id = ?
        AND f.deleted_at IS NULL
        AND (f.folder_id IS NULL OR fold.deleted_at IS NULL)
      ORDER BY f.created_at DESC
    `;
    const res = await this.db.execute({ sql, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async update(file: Pick<File, 'id' | 'name' | 'folder_id' | 'is_starred'>): Promise<void> {
    const query = `
      UPDATE files
      SET name = ?, folder_id = ?, is_starred = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this.db.execute({
      sql: query,
      args: [
        file.name,
        file.folder_id,
        file.is_starred ? 1 : 0,
        file.id,
      ],
    });
  }

  public async updateCaption(id: number, caption: string): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE files SET caption = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [caption, id],
    });
  }

  public async softDelete(id: number): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE files SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  }

  public async restore(id: number): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE files SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  }

  public async listTrashed(userId: number): Promise<File[]> {
    const query = 'SELECT * FROM files WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async permanentDelete(id: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM files WHERE id = ?',
      args: [id],
    });
  }

  public async permanentDeleteAllTrashed(userId: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM files WHERE user_id = ? AND deleted_at IS NOT NULL',
      args: [userId],
    });
  }

  public async listStarred(userId: number): Promise<File[]> {
    const query = 'SELECT * FROM files WHERE user_id = ? AND is_starred = 1 AND deleted_at IS NULL ORDER BY created_at DESC';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: any): File {
    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      folder_id: row.folder_id !== null && row.folder_id !== undefined ? Number(row.folder_id) : null,
      name: String(row.name),
      size: Number(row.size),
      mime_type: String(row.mime_type),
      telegram_message_id: Number(row.telegram_message_id),
      telegram_chat_id: String(row.telegram_chat_id),
      telegram_file_id: String(row.telegram_file_id || ''),
      caption: String(row.caption || ''),
      is_starred: Boolean(row.is_starred),
      deleted_at: row.deleted_at ? new Date(String(row.deleted_at)) : null,
      created_at: new Date(String(row.created_at)),
      updated_at: new Date(String(row.updated_at)),
    };
  }
}
