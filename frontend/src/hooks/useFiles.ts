import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDirectory,
  listMemories,
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
  getBreadcrumb as getBreadcrumbApi,
  updateCaption as updateCaptionApi,
  renameFile as renameFileApi,
  moveFile as moveFileApi,
  deleteFile as deleteFileApi,
  syncWithTelegram,
} from '../services/api';

export function useDirectory(folderId: string | null = null) {
  return useQuery({
    queryKey: ['directory', folderId],
    queryFn: () => listDirectory(folderId),
  });
}

export function useBreadcrumbs(folderId: string | null = null) {
  return useQuery({
    queryKey: ['breadcrumbs', folderId],
    queryFn: () => (folderId ? getBreadcrumbApi(folderId) : Promise.resolve([])),
    enabled: !!folderId,
  });
}

export function useMemories() {
  return useQuery({
    queryKey: ['memories'],
    queryFn: listMemories,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      createFolderApi(name, parentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory', variables.parentId] });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameFolderApi(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['breadcrumbs'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolderApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['breadcrumbs'] });
    },
  });
}

export function useUpdateCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      updateCaptionApi(id, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameFileApi(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      moveFileApi(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFileApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useSyncWithTelegram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncWithTelegram(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['directory'] });
      await queryClient.invalidateQueries({ queryKey: ['memories'] });
      await queryClient.invalidateQueries({ queryKey: ['breadcrumbs'] });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['directory'] }),
        queryClient.refetchQueries({ queryKey: ['memories'] }),
      ]);
    },
  });
}
