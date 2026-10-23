import type { Client } from '@libsql/client';
import type {
  File,
  FileRepository,
  SystemFileItem,
  SystemStorageStats,
  ListSystemFilesOptions,
} from '../domain/file.js';

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
      sql = 'SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL AND is_vault = 0 AND deleted_at IS NULL ORDER BY created_at DESC';
      args = [userId];
    } else {
      sql = 'SELECT * FROM files WHERE user_id = ? AND folder_id = ? AND is_vault = 0 AND deleted_at IS NULL ORDER BY created_at DESC';
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
        AND f.is_vault = 0
        AND (f.folder_id IS NULL OR (fold.deleted_at IS NULL AND fold.is_vault = 0))
      ORDER BY f.created_at DESC
    `;
    const res = await this.db.execute({ sql, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async listVault(userId: number): Promise<File[]> {
    const query = 'SELECT * FROM files WHERE user_id = ? AND is_vault = 1 AND deleted_at IS NULL ORDER BY updated_at DESC';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async setVaultStatus(userId: number, fileIds: number[], isVault: boolean): Promise<void> {
    if (fileIds.length === 0) return;
    const placeholders = fileIds.map(() => '?').join(',');
    const query = `UPDATE files SET is_vault = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id IN (${placeholders})`;
    await this.db.execute({
      sql: query,
      args: [isVault ? 1 : 0, userId, ...fileIds],
    });
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
    const query = 'SELECT * FROM files WHERE user_id = ? AND is_starred = 1 AND is_vault = 0 AND deleted_at IS NULL ORDER BY created_at DESC';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async getTotalStorageUsed(userId: number): Promise<number> {
    const query = 'SELECT COALESCE(SUM(size), 0) as total_size FROM files WHERE user_id = ? AND deleted_at IS NULL';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return Number(res.rows[0]?.total_size || 0);
  }

  public async getSystemStorageStats(): Promise<SystemStorageStats> {
    const totalRes = await this.db.execute(`
      SELECT
        COALESCE(SUM(size), 0) as total_bytes,
        COUNT(*) as total_files,
        SUM(CASE WHEN is_vault = 1 THEN 1 ELSE 0 END) as total_vault
      FROM files
      WHERE deleted_at IS NULL
    `);
    const totalBytes = Number(totalRes.rows[0]?.total_bytes || 0);
    const totalFiles = Number(totalRes.rows[0]?.total_files || 0);
    const totalVaultFiles = Number(totalRes.rows[0]?.total_vault || 0);

    const breakdownRes = await this.db.execute(`
      SELECT
        CASE
          WHEN mime_type LIKE 'image/%' THEN 'image'
          WHEN mime_type LIKE 'video/%' THEN 'video'
          WHEN mime_type LIKE 'audio/%' THEN 'audio'
          WHEN mime_type LIKE 'application/pdf' OR mime_type LIKE '%document%' OR mime_type LIKE '%text%' THEN 'document'
          ELSE 'other'
        END as category,
        COALESCE(SUM(size), 0) as cat_bytes,
        COUNT(*) as cat_count
      FROM files
      WHERE deleted_at IS NULL
      GROUP BY category
    `);

    const breakdown: Record<string, { bytes: number; count: number }> = {
      image: { bytes: 0, count: 0 },
      video: { bytes: 0, count: 0 },
      audio: { bytes: 0, count: 0 },
      document: { bytes: 0, count: 0 },
      other: { bytes: 0, count: 0 },
    };

    for (const row of breakdownRes.rows) {
      const cat = String(row.category || 'other');
      breakdown[cat] = {
        bytes: Number(row.cat_bytes || 0),
        count: Number(row.cat_count || 0),
      };
    }

    return {
      totalBytes,
      totalFiles,
      totalVaultFiles,
      breakdown,
    };
  }

  public async listAllSystemFiles(options: ListSystemFilesOptions = {}): Promise<{ files: SystemFileItem[]; total: number }> {
    const conditions: string[] = ['f.deleted_at IS NULL'];
    const args: any[] = [];

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push('(f.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      args.push(term, term, term, term, term);
    }

    if (options.category) {
      if (options.category === 'image') conditions.push("f.mime_type LIKE 'image/%'");
      else if (options.category === 'video') conditions.push("f.mime_type LIKE 'video/%'");
      else if (options.category === 'audio') conditions.push("f.mime_type LIKE 'audio/%'");
      else if (options.category === 'document') conditions.push("(f.mime_type LIKE 'application/pdf' OR f.mime_type LIKE '%document%' OR f.mime_type LIKE '%text%')");
      else if (options.category === 'vault') conditions.push("f.is_vault = 1");
    }

    if (options.isVault !== undefined) {
      conditions.push('f.is_vault = ?');
      args.push(options.isVault ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.execute({
      sql: `SELECT COUNT(*) as total FROM files f JOIN users u ON f.user_id = u.id WHERE ${whereClause}`,
      args: [...args],
    });
    const total = Number(countRes.rows[0]?.total || 0);

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const listRes = await this.db.execute({
      sql: `
        SELECT
          f.*,
          u.username as owner_username,
          u.phone as owner_phone,
          u.first_name as owner_first_name,
          u.last_name as owner_last_name
        FROM files f
        JOIN users u ON f.user_id = u.id
        WHERE ${whereClause}
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset],
    });

    const files: SystemFileItem[] = listRes.rows.map((row) => {
      const firstName = String(row.owner_first_name || '').trim();
      const lastName = String(row.owner_last_name || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      const username = String(row.owner_username || '').trim();
      const phone = String(row.owner_phone || '').trim();
      const ownerName = fullName || (username ? `@${username}` : '') || phone || 'Pengguna';

      return {
        ...this.mapRow(row),
        owner_username: username,
        owner_phone: phone,
        owner_name: ownerName,
      };
    });

    return { files, total };
  }

  public async adminDeleteFile(fileId: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM shares WHERE file_id = ?',
      args: [fileId],
    });
    await this.db.execute({
      sql: 'DELETE FROM files WHERE id = ?',
      args: [fileId],
    });
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
      is_vault: Boolean(row.is_vault),
      deleted_at: row.deleted_at ? new Date(String(row.deleted_at)) : null,
      created_at: new Date(String(row.created_at)),
      updated_at: new Date(String(row.updated_at)),
    };
  }
}
