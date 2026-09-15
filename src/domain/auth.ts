export interface AuthTransaction {
  id: string;
  phone: string;
  phone_code_hash: string;
  created_at: Date;
}

export interface AuthRepository {
  create(tx: Omit<AuthTransaction, 'created_at'>): Promise<void>;
  getById(id: string): Promise<AuthTransaction | null>;
  delete(id: string): Promise<void>;
}
