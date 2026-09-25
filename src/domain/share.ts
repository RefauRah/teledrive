export interface Share {
  id: number;
  user_id: number;
  file_id: number | null;
  folder_id: number | null;
  share_token: string;
  password_hash: string | null;
  expires_at: Date | null;
  max_downloads: number | null;
  download_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateShareParams {
  user_id: number;
  file_id?: number | null;
  folder_id?: number | null;
  share_token: string;
  password_hash?: string | null;
  expires_at?: Date | null;
  max_downloads?: number | null;
}

export interface ShareRepository {
  create(params: CreateShareParams): Promise<Share>;
  getById(id: number): Promise<Share | null>;
  getByToken(token: string): Promise<Share | null>;
  getByFileId(userId: number, fileId: number): Promise<Share | null>;
  getByFolderId(userId: number, folderId: number): Promise<Share | null>;
  listByUser(userId: number): Promise<Share[]>;
  incrementDownloadCount(id: number): Promise<void>;
  updateStatus(id: number, isActive: boolean): Promise<void>;
  delete(id: number): Promise<void>;
}
