export interface User {
  id: number;
  telegram_id: string; // BIGINT represented as string in JS to prevent precision loss
  phone: string;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  session_data?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRepository {
  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  getById(id: number): Promise<User | null>;
  getByTelegramId(telegramId: string): Promise<User | null>;
  getByPhone(phone: string): Promise<User | null>;
  updateSession(userId: number, sessionData: string): Promise<void>;
  update(user: Pick<User, 'id' | 'first_name' | 'last_name' | 'phone' | 'photo_url'>): Promise<void>;
}
