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
} from '../domain/types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, clear token and redirect to /login (exempt public /share routes)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/share/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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

const mapUser = (u: any): User => ({
  id: u.id.toString(),
  phone: u.phone,
  firstName: u.first_name || '',
  lastName: u.last_name || '',
  username: u.username,
  photoUrl: u.photo_url || '',
});

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

export async function uploadFile(
  file: File,
  folderId: string | null,
  onProgress: (progress: number) => void,
  abortSignal: AbortSignal
): Promise<VFile> {
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
export async function getFileBlobUrl(id: string): Promise<string> {
  const { data } = await api.get(`/api/vfs/download/${id}`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([data]));
}

export async function downloadFile(id: string): Promise<void> {
  const { data, headers } = await api.get(`/api/vfs/download/${id}`, {
    responseType: 'blob',
  });

  const contentDisposition = headers['content-disposition'];
  let filename = 'download';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+?)"?$/);
    if (match) filename = match[1];
  }

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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

export async function downloadPublicShare(
  token: string,
  fileId?: number,
  password?: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (password) {
    headers['X-Share-Password'] = password;
  }
  const params: Record<string, any> = {};
  if (fileId) {
    params.file_id = fileId;
  }

  const { data, headers: resHeaders } = await api.get(`/api/public/shares/${token}/download`, {
    headers,
    params,
    responseType: 'blob',
  });

  const contentDisposition = resHeaders['content-disposition'];
  let filename = 'download';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match) {
      try {
        filename = decodeURIComponent(match[1]);
      } catch {
        filename = match[1];
      }
    }
  }

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getPublicShareBlobUrl(
  token: string,
  fileId?: number,
  password?: string
): Promise<string> {
  const headers: Record<string, string> = {};
  if (password) {
    headers['X-Share-Password'] = password;
  }
  const params: Record<string, any> = {};
  if (fileId) {
    params.file_id = fileId;
  }

  const { data } = await api.get(`/api/public/shares/${token}/download`, {
    headers,
    params,
    responseType: 'blob',
  });

  return window.URL.createObjectURL(new Blob([data]));
}

