export interface User {
  id: number;
  telegram_id: string; // BIGINT represented as string in JS to prevent precision loss
  phone: string;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  role: 'user' | 'admin';
  password_hash?: string | null;
  is_banned: boolean;
  storage_quota_bytes?: number | null;
  session_data?: string;
  vault_pin?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ListUsersOptions {
  search?: string;
  role?: string;
  isBanned?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserRepository {
  create(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'role' | 'is_banned'> & {
    role?: 'user' | 'admin';
    is_banned?: boolean;
    password_hash?: string | null;
    storage_quota_bytes?: number | null;
  }): Promise<User>;
  getById(id: number): Promise<User | null>;
  getByTelegramId(telegramId: string): Promise<User | null>;
  getByPhone(phone: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  listAll(options?: ListUsersOptions): Promise<{ users: User[]; total: number }>;
  updateSession(userId: number, sessionData: string): Promise<void>;
  update(user: Pick<User, 'id' | 'first_name' | 'last_name' | 'phone' | 'photo_url'>): Promise<void>;
  updateRole(userId: number, role: 'user' | 'admin'): Promise<void>;
  updateBanStatus(userId: number, isBanned: boolean): Promise<void>;
  updateQuota(userId: number, quotaBytes: number | null): Promise<void>;
  updatePassword(userId: number, passwordHash: string): Promise<void>;
  setVaultPin(userId: number, pinHash: string | null): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  ensureDefaultAdmin(): Promise<User>;
}
