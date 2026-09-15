export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  username?: string;
  photoUrl?: string;
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
  createdAt: string;
  updatedAt: string;
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
