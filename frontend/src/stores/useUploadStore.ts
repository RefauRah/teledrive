import { create } from 'zustand';
import type { UploadQueueItem, UploadStatus } from '../domain/types';

interface UploadState {
  uploads: Map<string, UploadQueueItem>;
  isExpanded: boolean;
  addFile: (file: File, folderId: string | null) => string;
  updateProgress: (id: string, progress: number) => void;
  updateStatus: (id: string, status: UploadStatus, error?: string) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => void;
  clearCompleted: () => void;
  setExpanded: (expanded: boolean) => void;
}

let uploadCounter = 0;

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: new Map(),
  isExpanded: false,

  addFile: (file: File, folderId: string | null) => {
    const id = `upload_${Date.now()}_${++uploadCounter}`;
    const item: UploadQueueItem = {
      id,
      file,
      folderId,
      progress: 0,
      status: 'pending',
      abortController: new AbortController(),
    };
    const uploads = new Map(get().uploads);
    uploads.set(id, item);
    set({ uploads, isExpanded: true });
    return id;
  },

  updateProgress: (id: string, progress: number) => {
    const uploads = new Map(get().uploads);
    const item = uploads.get(id);
    if (item) {
      uploads.set(id, { ...item, progress, status: 'uploading' });
      set({ uploads });
    }
  },

  updateStatus: (id: string, status: UploadStatus, error?: string) => {
    const uploads = new Map(get().uploads);
    const item = uploads.get(id);
    if (item) {
      uploads.set(id, { ...item, status, error, progress: status === 'success' ? 100 : item.progress });
      set({ uploads });
    }
  },

  removeFile: (id: string) => {
    const uploads = new Map(get().uploads);
    const item = uploads.get(id);
    if (item && (item.status === 'pending' || item.status === 'uploading')) {
      item.abortController.abort();
    }
    uploads.delete(id);
    set({ uploads });
  },

  retryFile: (id: string) => {
    const uploads = new Map(get().uploads);
    const item = uploads.get(id);
    if (item) {
      uploads.set(id, {
        ...item,
        progress: 0,
        status: 'pending',
        error: undefined,
        abortController: new AbortController(),
      });
      set({ uploads });
    }
  },

  clearCompleted: () => {
    const uploads = new Map(get().uploads);
    for (const [key, item] of uploads) {
      if (item.status === 'success' || item.status === 'failed') {
        uploads.delete(key);
      }
    }
    set({ uploads });
  },

  setExpanded: (expanded: boolean) => {
    set({ isExpanded: expanded });
  },
}));
