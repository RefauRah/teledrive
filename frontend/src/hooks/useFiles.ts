import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDirectory,
  getBreadcrumb,
  createFolder,
  renameFolder as renameFolderApi,
  renameFile as renameFileApi,
  moveFolder as moveFolderApi,
  moveFile as moveFileApi,
  deleteFolder as deleteFolderApi,
  deleteFile as deleteFileApi,
  listTrash,
  restoreItem as restoreItemApi,
  emptyTrash as emptyTrashApi,
} from '../services/api';
import type { DirectoryContents } from '../domain/types';

export function useFiles(folderId: string | null) {
  return useQuery({
    queryKey: ['directory', folderId],
    queryFn: () => listDirectory(folderId),
    staleTime: 30_000,
  });
}

export function useBreadcrumb(folderId: string | null) {
  return useQuery({
    queryKey: ['breadcrumb', folderId],
    queryFn: () => getBreadcrumb(folderId),
    staleTime: 60_000,
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: () => listTrash(),
    staleTime: 30_000,
  });
}

export function useCreateFolder(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createFolder(name, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory', currentFolderId] });
    },
  });
}

export function useRenameFolder(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFolderApi(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          folders: previous.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory', currentFolderId] });
    },
  });
}

export function useRenameFile(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFileApi(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          files: previous.files.map((f) => (f.id === id ? { ...f, name } : f)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory', currentFolderId] });
    },
  });
}

export function useMoveFolder(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      moveFolderApi(id, parentId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          folders: previous.folders.filter((f) => f.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
    },
  });
}

export function useMoveFile(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      moveFileApi(id, parentId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          files: previous.files.filter((f) => f.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
    },
  });
}

export function useDeleteFolder(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFolderApi(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          folders: previous.folders.filter((f) => f.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory', currentFolderId] });
    },
  });
}

export function useDeleteFile(currentFolderId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFileApi(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['directory', currentFolderId] });
      const previous = queryClient.getQueryData<DirectoryContents>(['directory', currentFolderId]);
      if (previous) {
        queryClient.setQueryData<DirectoryContents>(['directory', currentFolderId], {
          ...previous,
          files: previous.files.filter((f) => f.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['directory', currentFolderId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['directory', currentFolderId] });
    },
  });
}

export function useRestoreItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }: { type: 'file' | 'folder'; id: string }) =>
      restoreItemApi(type, id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['directory'] });
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => emptyTrashApi(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}
