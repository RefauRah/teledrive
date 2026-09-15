import type { Client } from '@libsql/client';
import type { BreadcrumbItem, Folder, FolderRepository } from '../domain/folder.js';

export class TursoFolderRepository implements FolderRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(folder: { user_id: number; name: string; parent_id: number | null }): Promise<Folder> {
    const query = `
      INSERT INTO folders (user_id, name, parent_id, is_starred, created_at, updated_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, name, parent_id, is_starred, deleted_at, created_at, updated_at
    `;
    const res = await this.db.execute({
      sql: query,
      args: [
        folder.user_id,
        folder.name,
        folder.parent_id,
      ],
    });
    return this.mapRow(res.rows[0]);
  }

  public async getById(id: number): Promise<Folder | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM folders WHERE id = ?',
      args: [id],
    });
    if (!res.rows[0]) return null;
    return this.mapRow(res.rows[0]);
  }

  public async listByParent(userId: number, parentId: number | null): Promise<Folder[]> {
    let sql: string;
    let args: any[];

    if (parentId === null) {
      sql = 'SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL AND deleted_at IS NULL ORDER BY name';
      args = [userId];
    } else {
      sql = 'SELECT * FROM folders WHERE user_id = ? AND parent_id = ? AND deleted_at IS NULL ORDER BY name';
      args = [userId, parentId];
    }

    const res = await this.db.execute({ sql, args });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async update(folder: Pick<Folder, 'id' | 'name' | 'parent_id' | 'is_starred'>): Promise<void> {
    const query = `
      UPDATE folders
      SET name = ?, parent_id = ?, is_starred = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this.db.execute({
      sql: query,
      args: [
        folder.name,
        folder.parent_id,
        folder.is_starred ? 1 : 0,
        folder.id,
      ],
    });
  }

  public async softDelete(id: number): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE folders SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  }

  public async restore(id: number): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE folders SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  }

  public async listTrashed(userId: number): Promise<Folder[]> {
    const query = 'SELECT * FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  public async permanentDelete(id: number): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM folders WHERE id = ?',
      args: [id],
    });
  }

  public async getBreadcrumb(folderId: number, userId: number): Promise<BreadcrumbItem[]> {
    const query = `
      WITH RECURSIVE breadcrumb AS (
        SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id, f.name, f.parent_id FROM folders f JOIN breadcrumb b ON f.id = b.parent_id
      )
      SELECT id, name FROM breadcrumb ORDER BY id
    `;
    const res = await this.db.execute({ sql: query, args: [folderId, userId] });
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      name: String(r.name),
    }));
  }

  public async listStarred(userId: number): Promise<Folder[]> {
    const query = 'SELECT * FROM folders WHERE user_id = ? AND is_starred = 1 AND deleted_at IS NULL ORDER BY name';
    const res = await this.db.execute({ sql: query, args: [userId] });
    return res.rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: any): Folder {
    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      name: String(row.name),
      parent_id: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
      is_starred: Boolean(row.is_starred),
      deleted_at: row.deleted_at ? new Date(String(row.deleted_at)) : null,
      created_at: new Date(String(row.created_at)),
      updated_at: new Date(String(row.updated_at)),
    };
  }
}
