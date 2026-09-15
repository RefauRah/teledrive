export interface File {
  id: number;
  user_id: number;
  folder_id: number | null;
  name: string;
  size: number;
  mime_type: string;
  telegram_message_id: number;
  telegram_chat_id: string; // BIGINT as string in JS
  telegram_file_id: string;
  is_starred: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FileRepository {
  create(file: {
    user_id: number;
    folder_id: number | null;
    name: string;
    size: number;
    mime_type: string;
    telegram_message_id: number;
    telegram_chat_id: string;
    telegram_file_id: string;
  }): Promise<File>;
  getById(id: number): Promise<File | null>;
  listByFolder(userId: number, folderId: number | null): Promise<File[]>;
  update(file: Pick<File, 'id' | 'name' | 'folder_id' | 'is_starred'>): Promise<void>;
  softDelete(id: number): Promise<void>;
  restore(id: number): Promise<void>;
  listTrashed(userId: number): Promise<File[]>;
  permanentDelete(id: number): Promise<void>;
  permanentDeleteAllTrashed(userId: number): Promise<void>;
  listStarred(userId: number): Promise<File[]>;
}
