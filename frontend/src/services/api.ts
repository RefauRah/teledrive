import axios from 'axios';
import type {
  User,
  AuthTransaction,
  VFolder,
  VFile,
  BreadcrumbItem,
  DirectoryContent,
  Share,
  CreateSharePayload,
  PublicShareData,
  AdminStats,
  AdminUserItem,
  AdminFileItem,
  AdminConfig,
} from '../domain/types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT from sessionStorage and Vault token from sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const vaultToken = sessionStorage.getItem('vault_token');
    if (vaultToken) {
      config.headers['X-Vault-Token'] = vaultToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to reset session to initial page
function clearSessionAndGoHome() {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_user');
  sessionStorage.removeItem('server_instance_id');
  sessionStorage.removeItem('vault_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// Response interceptor: on server restart, 401, or server downtime, redirect to initial page
api.interceptors.response.use(
  (response) => {
    const serverInstance = response.headers['x-server-instance'];
    if (serverInstance) {
      const storedInstance = sessionStorage.getItem('server_instance_id');
      if (storedInstance && storedInstance !== serverInstance) {
        // Server restarted while the user session was active
        clearSessionAndGoHome();
        return Promise.reject(new Error('Server telah direstart. Sesi diatur ulang ke halaman awal.'));
      }
      sessionStorage.setItem('server_instance_id', serverInstance);
    }
    return response;
  },
  (error) => {
    const isPublicShare = typeof window !== 'undefined' && window.location.pathname.startsWith('/share/');
    if (!isPublicShare) {
      // 401 Unauthorized
      if (error.response?.status === 401) {
        clearSessionAndGoHome();
      } else if (!error.response && sessionStorage.getItem('auth_token')) {
        // Network Error / Server offline / mati
        clearSessionAndGoHome();
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────
export async function sendCode(phone: string): Promise<AuthTransaction> {
  const { data } = await api.post<{ transaction_id: string }>('/api/auth/send-code', { phone }, { timeout: 15000 });
  return {
    transactionId: data.transaction_id,
    requiresPassword: false,
  };
}

const mapUser = (u: any): User => {
  const quota =
    u.storage_quota_bytes !== undefined && u.storage_quota_bytes !== null
      ? Number(u.storage_quota_bytes)
      : u.storageQuotaBytes !== undefined && u.storageQuotaBytes !== null
      ? Number(u.storageQuotaBytes)
      : null;

  return {
    id: u.id.toString(),
    phone: u.phone,
    firstName: u.first_name || u.firstName || '',
    lastName: u.last_name || u.lastName || '',
    username: u.username,
    photoUrl: u.photo_url || u.photoUrl || '',
    role: u.role || 'user',
    isBanned: Boolean(u.is_banned ?? u.isBanned),
    storageQuotaBytes: quota,
  };
};

export async function loginWithPassword(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: any }>('/api/auth/login', {
    username,
    password,
  });
  return {
    token: data.token,
    user: mapUser(data.user),
  };
}

export async function signIn(
  transactionId: string,
  code: string,
  password?: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: any }>('/api/auth/sign-in', {
    transaction_id: transactionId,
    code,
    password,
  }, { timeout: 15000 });
  return {
    token: data.token,
    user: mapUser(data.user),
  };
}

export interface QrCodeResponse {
  transaction_id: string;
  qr_url: string;
  expires: number;
}

export interface QrStatusResponse {
  status: 'pending' | 'success' | 'password_required' | 'expired' | 'error';
  qr_url?: string;
  expires?: number;
  token?: string;
  user?: User;
  message?: string;
}

export async function exportQrCode(): Promise<QrCodeResponse> {
  const { data } = await api.post<QrCodeResponse>('/api/auth/qr-code', {}, { timeout: 15000 });
  return data;
}

export async function checkQrStatus(transactionId: string): Promise<QrStatusResponse> {
  const { data } = await api.get<any>('/api/auth/qr-status', {
    params: { transaction_id: transactionId },
    timeout: 15000,
  });
  return {
    ...data,
    user: data.user ? mapUser(data.user) : undefined,
  };
}

export async function submitQrPassword(
  transactionId: string,
  password: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: any }>('/api/auth/qr-password', {
    transaction_id: transactionId,
    password,
  }, { timeout: 15000 });
  return {
    token: data.token,
    user: mapUser(data.user),
  };
}

export async function updateProfile(
  firstName: string,
  lastName: string,
  phone: string,
  photoUrl: string
): Promise<User> {
  const { data } = await api.put<any>('/api/auth/profile', {
    first_name: firstName,
    last_name: lastName,
    phone,
    photo_url: photoUrl,
  });
  return mapUser(data);
}

// ─── Mappers ─────────────────────────────────────────────────
const mapFolder = (f: any): VFolder => ({
  id: f.id.toString(),
  name: f.name,
  parentId: f.parent_id ? f.parent_id.toString() : null,
  isStarred: Boolean(f.is_starred),
  isVault: Boolean(f.is_vault),
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

const mapFile = (f: any): VFile => ({
  id: f.id.toString(),
  name: f.name,
  folderId: f.folder_id ? f.folder_id.toString() : null,
  size: f.size,
  mimeType: f.mime_type || 'application/octet-stream',
  caption: f.caption || '',
  isStarred: Boolean(f.is_starred),
  isVault: Boolean(f.is_vault),
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

const mapShare = (s: any): Share => ({
  id: s.id,
  userId: s.user_id ?? s.userId,
  fileId: s.file_id ?? s.fileId ?? null,
  folderId: s.folder_id ?? s.folderId ?? null,
  shareToken: s.share_token ?? s.shareToken ?? '',
  passwordHash: s.password_hash ?? s.passwordHash ?? null,
  expiresAt: s.expires_at ?? s.expiresAt ?? null,
  maxDownloads: s.max_downloads ?? s.maxDownloads ?? null,
  downloadCount: s.download_count ?? s.downloadCount ?? 0,
  isActive: Boolean(s.is_active ?? s.isActive),
  createdAt: s.created_at ?? s.createdAt,
  updatedAt: s.updated_at ?? s.updatedAt,
});

// ─── Directory & Folder API ──────────────────────────────────
export async function listDirectory(folderId: string | null = null): Promise<DirectoryContent> {
  const params: Record<string, string> = {};
  if (folderId) {
    params.folder_id = folderId;
  }
  const { data } = await api.get<any>('/api/vfs/list', { params });
  return {
    folders: (data.folders || []).map(mapFolder),
    files: (data.files || []).map(mapFile),
  };
}

export async function createFolder(name: string, parentId: string | null = null): Promise<VFolder> {
  const { data } = await api.post<any>('/api/vfs/folders', {
    name,
    parent_id: parentId ? parseInt(parentId, 10) : null,
  });
  return mapFolder(data);
}

export async function renameFolder(id: string, name: string): Promise<VFolder> {
  const { data } = await api.patch<any>(`/api/vfs/folders/${id}/rename`, { name });
  return mapFolder(data);
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/vfs/folders/${id}`);
}

export async function getBreadcrumb(folderId: string): Promise<BreadcrumbItem[]> {
  const { data } = await api.get<any>('/api/vfs/breadcrumb', {
    params: { folder_id: folderId },
  });
  return (data.breadcrumb || []).map((b: any) => ({
    id: b.id.toString(),
    name: b.name,
  }));
}

// ─── Memories API (All Files) ────────────────────────────────
export async function listMemories(): Promise<VFile[]> {
  const { data } = await api.get<any>('/api/vfs/memories');
  return (data.files || []).map(mapFile);
}

export async function syncWithTelegram(): Promise<{ added: number; synced: number }> {
  const { data } = await api.post<{ added: number; synced: number }>('/api/vfs/sync');
  return data;
}

// ─── File Operations ─────────────────────────────────────────
export async function updateCaption(id: string, caption: string): Promise<VFile> {
  const { data } = await api.patch<any>(`/api/vfs/files/${id}/caption`, { caption });
  return mapFile(data);
}

export async function renameFile(id: string, name: string): Promise<VFile> {
  const { data } = await api.patch<any>(`/api/vfs/files/${id}/rename`, { name });
  return mapFile(data);
}

export async function moveFile(id: string, folderId: string | null): Promise<VFile> {
  const { data } = await api.patch<any>(`/api/vfs/files/${id}/move`, {
    folder_id: folderId ? parseInt(folderId, 10) : null,
  });
  return mapFile(data);
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/api/vfs/files/${id}`);
}

// ─── Upload (Chunked for Serverless / Large Files up to 2GB) ──
const CHUNK_SIZE = 512 * 1024; // 512 KB chunks (bypasses Vercel 4.5MB limit)

export async function checkUploadQuota(fileSize: number): Promise<void> {
  await api.post('/api/vfs/check-quota', { fileSize });
}

export async function uploadFile(
  file: File,
  folderId: string | null,
  onProgress: (progress: number) => void,
  abortSignal: AbortSignal
): Promise<VFile> {
  // Pre-validate user's storage quota BEFORE uploading any chunks!
  await checkUploadQuota(file.size);

  // Telegram requires isBig = true for files > 10MB
  const isBig = file.size > 10 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const fileId = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

  let uploadedBytes = 0;

  for (let partIndex = 0; partIndex < totalParts; partIndex++) {
    if (abortSignal.aborted) {
      throw new Error('Upload dibatalkan');
    }

    const start = partIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    await api.post('/api/vfs/upload-chunk', chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Id': fileId,
        'X-Part-Index': partIndex.toString(),
        'X-Total-Parts': totalParts.toString(),
        'X-Is-Big': isBig ? '1' : '0',
        'X-File-Size': file.size.toString(),
      },
      signal: abortSignal,
      onUploadProgress: (event) => {
        if (event.loaded) {
          const currentTotalLoaded = uploadedBytes + event.loaded;
          const percent = Math.min(99, Math.round((currentTotalLoaded / (file.size || 1)) * 100));
          onProgress(percent);
        }
      },
    });

    uploadedBytes += chunk.size;
    const percent = Math.min(99, Math.round((uploadedBytes / (file.size || 1)) * 100));
    onProgress(percent);
  }

  // Complete chunked upload and persist to Telegram & DB
  const { data } = await api.post<any>(
    '/api/vfs/upload-complete',
    {
      fileId,
      totalParts,
      fileName: file.name,
      fileSize: file.size,
      folderId: folderId ? parseInt(folderId, 10) : null,
      isBig,
    },
    { signal: abortSignal }
  );

  onProgress(100);
  return mapFile(data);
}

// ─── Download & Preview ──────────────────────────────────────
export function getFileDownloadUrl(id: string, customVaultToken?: string): string {
  const token = sessionStorage.getItem('auth_token');
  const vaultToken = customVaultToken || sessionStorage.getItem('vault_token');
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (vaultToken) params.set('vault_token', vaultToken);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return `${baseUrl}/api/vfs/download/${id}${queryString}`;
}

export async function getFileBlobUrl(id: string): Promise<string> {
  // Return direct authenticated streaming URL for instant HTML5 media playback (video, audio, image)
  return getFileDownloadUrl(id);
}

export async function downloadFile(id: string): Promise<void> {
  // Trigger direct native browser streaming download directly to disk without RAM buffering
  const url = getFileDownloadUrl(id);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '');
  link.setAttribute('target', '_blank');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
  }, 200);
}

// ─── Sharing (Google Drive style) ────────────────────────────
export async function createShareLink(payload: CreateSharePayload): Promise<Share> {
  const { data } = await api.post<any>('/api/vfs/shares', {
    fileId: payload.fileId ? (typeof payload.fileId === 'string' ? parseInt(payload.fileId, 10) : payload.fileId) : undefined,
    folderId: payload.folderId ? (typeof payload.folderId === 'string' ? parseInt(payload.folderId, 10) : payload.folderId) : undefined,
    password: payload.password,
    expiresInDays: payload.expiresInDays,
    maxDownloads: payload.maxDownloads,
  });
  return mapShare(data);
}

export async function getItemShare(type: 'file' | 'folder', id: string): Promise<Share | null> {
  const { data } = await api.get<any>(`/api/vfs/shares/item/${type}/${id}`);
  return data ? mapShare(data) : null;
}

export async function listUserShares(): Promise<Share[]> {
  const { data } = await api.get<any[]>('/api/vfs/shares');
  return (data || []).map(mapShare);
}

export async function revokeShare(shareId: number): Promise<void> {
  await api.delete(`/api/vfs/shares/${shareId}`);
}

// ─── Public Share Endpoints (No login required) ───────────────
export async function getPublicShare(token: string, password?: string): Promise<PublicShareData> {
  const headers: Record<string, string> = {};
  if (password) {
    headers['X-Share-Password'] = password;
  }
  const { data } = await api.get<PublicShareData>(`/api/public/shares/${token}`, { headers });
  return data;
}

export function getPublicDownloadUrl(token: string, fileId?: number, password?: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const params = new URLSearchParams();
  if (fileId) params.append('file_id', fileId.toString());
  if (password) params.append('password', password);
  const qs = params.toString();
  return `${baseUrl}/api/public/shares/${token}/download${qs ? `?${qs}` : ''}`;
}

export async function downloadPublicShare(
  token: string,
  fileId?: number,
  password?: string
): Promise<void> {
  const url = getPublicDownloadUrl(token, fileId, password);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '');
  link.setAttribute('target', '_blank');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
  }, 200);
}

export async function getPublicShareBlobUrl(
  token: string,
  fileId?: number,
  password?: string
): Promise<string> {
  return getPublicDownloadUrl(token, fileId, password);
}

// ─── Storage API ─────────────────────────────────────────────
export interface StorageUsageInfo {
  usedBytes: number;
  quotaBytes: number;
  isUnlimited: boolean;
  usedPercentage: number;
}

export async function getStorageUsage(): Promise<StorageUsageInfo> {
  const { data } = await api.get<StorageUsageInfo>('/api/vfs/storage');
  return data;
}

// ─── Private Vault API ───────────────────────────────────────
export function getStoredVaultToken(): string | null {
  return sessionStorage.getItem('vault_token');
}

export function setStoredVaultToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem('vault_token', token);
  } else {
    sessionStorage.removeItem('vault_token');
  }
}

export async function getVaultStatus(): Promise<{ hasPin: boolean }> {
  const { data } = await api.get<{ hasPin: boolean }>('/api/vfs/vault/status');
  return data;
}

export async function setupVaultPin(pin: string): Promise<{ vaultToken: string }> {
  const { data } = await api.post<{ vaultToken: string }>('/api/vfs/vault/setup', { pin });
  setStoredVaultToken(data.vaultToken);
  return data;
}

export async function verifyVaultPin(pin: string): Promise<{ vaultToken: string }> {
  const { data } = await api.post<{ vaultToken: string }>('/api/vfs/vault/verify', { pin });
  setStoredVaultToken(data.vaultToken);
  return data;
}

export async function changeVaultPin(currentPin: string, newPin: string): Promise<void> {
  await api.post('/api/vfs/vault/change-pin', { currentPin, newPin });
}

export async function getVaultItems(): Promise<{ files: VFile[]; folders: VFolder[] }> {
  const { data } = await api.get<{ files: any[]; folders: any[] }>('/api/vfs/vault/items');
  return {
    files: (data.files || []).map(mapFile),
    folders: (data.folders || []).map(mapFolder),
  };
}

export async function toggleVaultStatus(
  fileIds: string[],
  folderIds: string[],
  isVault: boolean
): Promise<void> {
  await api.post('/api/vfs/vault/toggle', {
    fileIds: fileIds.map((id) => parseInt(id, 10)),
    folderIds: folderIds.map((id) => parseInt(id, 10)),
    isVault,
  });
}

// ─── Admin API ───────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/api/admin/stats');
  return data;
}

export async function getAdminUsers(params: {
  search?: string;
  role?: string;
  is_banned?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ users: AdminUserItem[]; total: number }> {
  const { data } = await api.get<{ users: AdminUserItem[]; total: number }>('/api/admin/users', { params });
  return data;
}

export async function createAdminUser(userData: {
  username: string;
  password: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'admin';
  storage_quota_bytes?: number | null;
}): Promise<User> {
  const { data } = await api.post<any>('/api/admin/users', userData);
  return mapUser(data);
}

export async function updateAdminUser(
  userId: number,
  userData: {
    role?: 'user' | 'admin';
    is_banned?: boolean;
    storage_quota_bytes?: number | null;
    reset_vault_pin?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.patch<{ success: boolean; message: string }>(`/api/admin/users/${userId}`, userData);
  return data;
}

export async function deleteAdminUser(userId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/api/admin/users/${userId}`);
  return data;
}

export async function getAdminFiles(params: {
  search?: string;
  category?: string;
  is_vault?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ files: AdminFileItem[]; total: number }> {
  const { data } = await api.get<{ files: AdminFileItem[]; total: number }>('/api/admin/files', { params });
  return data;
}

export async function deleteAdminFile(fileId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/api/admin/files/${fileId}`);
  return data;
}
export async function getAdminConfig(): Promise<AdminConfig> {
  const { data } = await api.get<AdminConfig>('/api/admin/config');
  return data;
}

export async function verifyMe(): Promise<{ user: User; serverInstanceId: string }> {
  const { data } = await api.get<{ user: any; serverInstanceId: string }>('/api/auth/me');
  return {
    user: mapUser(data.user),
    serverInstanceId: data.serverInstanceId,
  };
}
