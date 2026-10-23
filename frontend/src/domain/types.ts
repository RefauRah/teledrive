export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  username?: string;
  photoUrl?: string;
  role?: 'user' | 'admin';
  isBanned?: boolean;
  storageQuotaBytes?: number | null;
}

export interface AuthTransaction {
  transactionId: string;
  requiresPassword: boolean;
}

export interface VFolder {
  id: string;
  name: string;
  parentId: string | null;
  isStarred?: boolean;
  isVault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface VFile {
  id: string;
  name: string;
  folderId: string | null;
  size: number;
  mimeType: string;
  caption: string;
  isStarred?: boolean;
  isVault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultStatusResponse {
  hasPin: boolean;
}

export interface VaultItemsResponse {
  files: VFile[];
  folders: VFolder[];
}

export interface DirectoryContent {
  folders: VFolder[];
  files: VFile[];
}

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'failed';

export interface UploadQueueItem {
  id: string;
  file: File;
  folderId: string | null;
  caption: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  abortController: AbortController;
}

export interface Share {
  id: number;
  userId: number;
  fileId: number | null;
  folderId: number | null;
  shareToken: string;
  passwordHash: string | null;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharePayload {
  fileId?: string | number | null;
  folderId?: string | number | null;
  password?: string | null;
  expiresInDays?: number | null;
  maxDownloads?: number | null;
}

export interface PublicShareItem {
  id: number;
  name: string;
  size?: number;
  mimeType?: string;
  caption?: string;
  createdAt: string;
  files?: Array<{
    id: number;
    name: string;
    size: number;
    mimeType: string;
    createdAt: string;
  }>;
}

export interface PublicShareData {
  shareToken: string;
  type: 'file' | 'folder';
  isPasswordProtected: boolean;
  isAuthorized: boolean;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  ownerName: string;
  item: PublicShareItem | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  totalFiles: number;
  totalVaultFiles: number;
  totalFolders: number;
  totalShares: number;
  totalBytes: number;
  breakdown: Record<string, { bytes: number; count: number }>;
  health: {
    status: 'healthy' | 'degraded';
    uptimeSeconds: number;
    memoryUsedBytes: number;
    nodeVersion: string;
    defaultQuotaBytes: number;
  };
}

export interface AdminUserItem {
  id: number;
  telegram_id: string;
  phone: string;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  storage_quota_bytes: number | null;
  storage_used: number;
  is_unlimited: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminFileItem {
  id: number;
  user_id: number;
  folder_id: number | null;
  name: string;
  size: number;
  mime_type: string;
  caption: string;
  is_starred: boolean;
  is_vault: boolean;
  created_at: string;
  owner_username: string;
  owner_phone: string;
  owner_name: string;
}

export interface AdminConfig {
  storageQuotaBytes: number;
  unlimitedPhones: string[];
  allowedPhones: string[];
  port: number;
  nodeEnv: string;
}
