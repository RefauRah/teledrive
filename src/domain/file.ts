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
  caption: string;
  is_starred: boolean;
  is_vault: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SystemFileItem extends File {
  owner_username: string;
  owner_phone: string;
  owner_name: string;
}

export interface SystemStorageStats {
  totalBytes: number;
  totalFiles: number;
  totalVaultFiles: number;
  breakdown: Record<string, { bytes: number; count: number }>;
}

export interface ListSystemFilesOptions {
  search?: string;
  category?: string;
  isVault?: boolean;
  limit?: number;
  offset?: number;
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
    caption?: string;
  }): Promise<File>;
  getById(id: number): Promise<File | null>;
  listByFolder(userId: number, folderId: number | null): Promise<File[]>;
  update(file: Pick<File, 'id' | 'name' | 'folder_id' | 'is_starred'>): Promise<void>;
  updateCaption(id: number, caption: string): Promise<void>;
  softDelete(id: number): Promise<void>;
  restore(id: number): Promise<void>;
  listTrashed(userId: number): Promise<File[]>;
  permanentDelete(id: number): Promise<void>;
  permanentDeleteAllTrashed(userId: number): Promise<void>;
  listStarred(userId: number): Promise<File[]>;
  listAll(userId: number): Promise<File[]>;
  listVault(userId: number): Promise<File[]>;
  setVaultStatus(userId: number, fileIds: number[], isVault: boolean): Promise<void>;
  getTotalStorageUsed(userId: number): Promise<number>;
  getSystemStorageStats(): Promise<SystemStorageStats>;
  listAllSystemFiles(options?: ListSystemFilesOptions): Promise<{ files: SystemFileItem[]; total: number }>;
  adminDeleteFile(fileId: number): Promise<void>;
}
