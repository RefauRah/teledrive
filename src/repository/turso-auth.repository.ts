import type { Client } from '@libsql/client';
import type { AuthRepository, AuthTransaction } from '../domain/auth.js';

export class TursoAuthRepository implements AuthRepository {
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  public async create(tx: Omit<AuthTransaction, 'created_at'>): Promise<void> {
    await this.db.execute({
      sql: 'INSERT INTO auth_transactions (id, phone, phone_code_hash, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      args: [tx.id, tx.phone, tx.phone_code_hash],
    });
  }

  public async getById(id: string): Promise<AuthTransaction | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM auth_transactions WHERE id = ?',
      args: [id],
    });
    if (!res.rows[0]) return null;
    return {
      id: String(res.rows[0].id),
      phone: String(res.rows[0].phone),
      phone_code_hash: String(res.rows[0].phone_code_hash),
      created_at: new Date(String(res.rows[0].created_at)),
    };
  }

  public async delete(id: string): Promise<void> {
    await this.db.execute({
      sql: 'DELETE FROM auth_transactions WHERE id = ?',
      args: [id],
    });
  }
}
