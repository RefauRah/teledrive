import axios from 'axios';
import type {
  User,
  AuthTransaction,
  DirectoryContents,
  VFolder,
  VFile,
  BreadcrumbItem,
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

// Response interceptor: on 401, clear token and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export async function sendCode(phone: string): Promise<AuthTransaction> {
  const { data } = await api.post<{ transaction_id: string }>('/api/auth/send-code', { phone }, { timeout: 15000 });
  return {
    transactionId: data.transaction_id,
    requiresPassword: false, // Determined dynamically during sign-in attempt
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

// Helper to map backend Folder keys to frontend VFolder structure
const mapFolder = (f: any): VFolder => ({
  id: f.id.toString(),
  name: f.name,
  parentId: f.parent_id ? f.parent_id.toString() : null,
  isStarred: f.is_starred,
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

// Helper to map backend File keys to frontend VFile structure
const mapFile = (f: any): VFile => ({
  id: f.id.toString(),
  name: f.name,
  folderId: f.folder_id ? f.folder_id.toString() : null,
  size: f.size,
  mimeType: f.mime_type || 'application/octet-stream',
  isStarred: f.is_starred,
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

// Directory API
export async function listDirectory(folderId?: string | null): Promise<DirectoryContents> {
  const params = folderId ? { folder_id: folderId } : {};
  const { data } = await api.get<any>('/api/vfs/list', { params });
  return {
    folders: (data.folders || []).map(mapFolder),
    files: (data.files || []).map(mapFile),
  };
}

export async function getBreadcrumb(folderId?: string | null): Promise<BreadcrumbItem[]> {
  if (!folderId) return [];
  const { data } = await api.get<{ breadcrumb: any[] }>('/api/vfs/breadcrumb', {
    params: { folder_id: folderId },
  });
  return (data.breadcrumb || []).map((b) => ({
    id: b.id ? b.id.toString() : null,
    name: b.name,
  }));
}

// Folder operations
export async function createFolder(
  name: string,
  parentId?: string | null
): Promise<VFolder> {
  const parent_id = parentId ? parseInt(parentId, 10) : null;
  const { data } = await api.post<any>('/api/vfs/folders', { name, parent_id });
  return mapFolder(data);
}

export async function renameFolder(id: string, name: string): Promise<VFolder> {
  const { data } = await api.patch<any>(`/api/vfs/folders/${id}/rename`, { name });
  return mapFolder(data);
}

export async function moveFolder(id: string, parentId: string | null): Promise<VFolder> {
  const parent_id = parentId ? parseInt(parentId, 10) : null;
  const { data } = await api.patch<any>(`/api/vfs/folders/${id}/move`, { parent_id });
  return mapFolder(data);
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/vfs/folders/${id}`);
}

// File operations
export async function renameFile(id: string, name: string): Promise<VFile> {
  const { data } = await api.patch<any>(`/api/vfs/files/${id}/rename`, { name });
  return mapFile(data);
}

export async function moveFile(id: string, parentId: string | null): Promise<VFile> {
  const folder_id = parentId ? parseInt(parentId, 10) : null;
  const { data } = await api.patch<any>(`/api/vfs/files/${id}/move`, { folder_id });
  return mapFile(data);
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/api/vfs/files/${id}`);
}

// Upload file directly as stream (binary payload)
export async function uploadFile(
  file: File,
  folderId: string | null,
  onProgress: (progress: number) => void,
  abortSignal: AbortSignal
): Promise<VFile> {
  const params: Record<string, string> = {};
  if (folderId) {
    params.folder_id = folderId;
  }

  const { data } = await api.post<any>('/api/vfs/upload', file, {
    params,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': file.name,
      'Content-Length': file.size.toString(),
    },
    onUploadProgress: (event) => {
      if (event.total) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    },
    signal: abortSignal,
  });
  return mapFile(data);
}

export async function getFileBlobUrl(id: string): Promise<string> {
  const { data } = await api.get(`/api/vfs/download/${id}`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([data]));
}

// Download
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

// Trash API
export async function listTrash(): Promise<DirectoryContents> {
  const { data } = await api.get<any>('/api/vfs/trash');
  return {
    folders: (data.folders || []).map(mapFolder),
    files: (data.files || []).map(mapFile),
  };
}

export async function restoreItem(type: 'file' | 'folder', id: string): Promise<void> {
  await api.post(`/api/vfs/restore/${type}/${id}`);
}

export async function emptyTrash(): Promise<void> {
  await api.delete('/api/vfs/trash');
}

// Starred API
export async function listStarred(): Promise<DirectoryContents> {
  const { data } = await api.get<any>('/api/vfs/starred');
  return {
    folders: (data.folders || []).map(mapFolder),
    files: (data.files || []).map(mapFile),
  };
}

export async function toggleStar(type: 'file' | 'folder', id: string): Promise<void> {
  await api.patch(`/api/vfs/starred/${type}/${id}`);
}

