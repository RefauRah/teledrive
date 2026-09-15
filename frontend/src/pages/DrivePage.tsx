import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';
import { Topbar } from '../components/layout/Topbar';
import { MemoryGrid } from '../components/gallery/MemoryGrid';
import { LightboxModal } from '../components/gallery/LightboxModal';
import { CreateAlbumModal } from '../components/gallery/CreateAlbumModal';
import { RenameAlbumModal } from '../components/gallery/RenameAlbumModal';
import { RenameFileModal } from '../components/gallery/RenameFileModal';
import { EditCaptionModal } from '../components/gallery/EditCaptionModal';
import { MoveFileModal } from '../components/gallery/MoveFileModal';
import { VaultModal } from '../components/gallery/VaultModal';
import { SelectionToolbar } from '../components/gallery/SelectionToolbar';
import { ContextMenu, type ContextMenuState } from '../components/gallery/ContextMenu';
import { UploaderPanel } from '../components/upload/UploaderPanel';
import {
  useDirectory,
  useBreadcrumbs,
  useMemories,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useMoveFile,
  useUpdateCaption,
  useRenameFile,
  useDeleteFile,
} from '../hooks/useFiles';
import { downloadFile } from '../services/api';
import { useUploadStore } from '../stores/useUploadStore';
import type { VFile, VFolder } from '../domain/types';

export const MemoriesPage: React.FC = () => {
  const { user, isAuthenticated, initialize } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Current folder ID from URL query params or null for root
  const currentFolderId = searchParams.get('folder_id') || null;

  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxFile, setLightboxFile] = useState<VFile | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Selection states
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [movingFiles, setMovingFiles] = useState<VFile[]>([]);

  // Context Menu state
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);

  // Modals state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<VFolder | null>(null);
  const [renamingFile, setRenamingFile] = useState<VFile | null>(null);
  const [editingCaptionFile, setEditingCaptionFile] = useState<VFile | null>(null);
  const [movingFile, setMovingFile] = useState<VFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileToQueue = useUploadStore((state) => state.addFile);

  // React Query Hooks
  const { data: directoryContent, isLoading, refetch: refetchDirectory } = useDirectory(currentFolderId);
  const { data: breadcrumbs = [] } = useBreadcrumbs(currentFolderId);
  const { data: allMemories = [], refetch: refetchMemories } = useMemories();

  const createFolderMutation = useCreateFolder();
  const renameFolderMutation = useRenameFolder();
  const deleteFolderMutation = useDeleteFolder();
  const renameFileMutation = useRenameFile();
  const moveFileMutation = useMoveFile();
  const updateCaptionMutation = useUpdateCaption();
  const deleteFileMutation = useDeleteFile();

  const folders = directoryContent?.folders || [];
  const files = directoryContent?.files || [];

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  // Folder navigation
  const handleFolderNavigate = (folderId: string | null) => {
    if (folderId) {
      setSearchParams({ folder_id: folderId });
    } else {
      setSearchParams({});
    }
    setSearchQuery('');
  };

  // Clear selection when navigating folder
  useEffect(() => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
  }, [currentFolderId]);

  // Upload into current folder
  const handleUpload = (uploadedFiles: File[], targetFolderId: string | null = currentFolderId) => {
    uploadedFiles.forEach((file) => {
      addFileToQueue(file, targetFolderId);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(Array.from(e.target.files), currentFolderId);
      e.target.value = '';
    }
  };

  const filteredFolders = searchQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;

  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  // Single-click select handlers
  const handleFileSelect = (_e: React.MouseEvent, file: VFile) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(file.id)) next.delete(file.id);
      else next.add(file.id);
      return next;
    });
  };

  const handleFolderSelect = (_e: React.MouseEvent, folder: VFolder) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folder.id)) next.delete(folder.id);
      else next.add(folder.id);
      return next;
    });
  };

  const handleSelectAll = useCallback(() => {
    setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    setSelectedFolderIds(new Set(filteredFolders.map((f) => f.id)));
  }, [filteredFiles, filteredFolders]);

  const handleClearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
  }, []);

  // Keyboard shortcut: Escape to clear selection, Cmd/Ctrl+A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        handleClearSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleClearSelection]);

  // Double-click preview handler (2x clicks)
  const handleFileDoubleClick = (file: VFile, index: number) => {
    setLightboxFile(file);
    setLightboxIndex(index);
  };

  // Lightbox handlers
  const handleFileClick = (file: VFile, _index: number) => {
    // If multiple items are already selected, single click toggles selection
    if (selectedFileIds.size > 0 || selectedFolderIds.size > 0) {
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        if (next.has(file.id)) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
    } else {
      setSelectedFileIds(new Set([file.id]));
    }
  };

  const handleLightboxNavigate = (index: number) => {
    if (index >= 0 && index < filteredFiles.length) {
      setLightboxFile(filteredFiles[index]);
      setLightboxIndex(index);
    }
  };

  const handleCaptionSave = (id: string, caption: string) => {
    updateCaptionMutation.mutate({ id, caption });
    if (lightboxFile && lightboxFile.id === id) {
      setLightboxFile({ ...lightboxFile, caption });
    }
  };

  const handleRenameFile = (id: string, name: string) => {
    renameFileMutation.mutate({ id, name });
    setRenamingFile(null);
  };

  const handleDeleteFile = (id: string) => {
    deleteFileMutation.mutate(id);
    setLightboxFile(null);
  };

  // Folder actions
  const handleCreateAlbum = (name: string) => {
    createFolderMutation.mutate({ name, parentId: currentFolderId });
  };

  const handleRenameAlbum = (id: string, name: string) => {
    renameFolderMutation.mutate({ id, name });
    setRenamingFolder(null);
  };

  const handleDeleteAlbum = (folder: VFolder) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus album "${folder.name}"? File di dalamnya juga akan terhapus.`)) {
      deleteFolderMutation.mutate(folder.id);
    }
  };

  const handleMoveFile = (fileId: string, targetFolderId: string | null) => {
    moveFileMutation.mutate({ id: fileId, folderId: targetFolderId });
    setMovingFile(null);
    if (lightboxFile && lightboxFile.id === fileId) {
      setLightboxFile(null);
    }
  };

  // Batch actions
  const selectedFilesList = filteredFiles.filter((f) => selectedFileIds.has(f.id));
  const selectedFoldersList = filteredFolders.filter((f) => selectedFolderIds.has(f.id));
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const handleBatchDownload = async () => {
    try {
      setIsBatchDownloading(true);
      for (const f of selectedFilesList) {
        await downloadFile(f.id);
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleBatchDelete = async () => {
    const total = selectedFilesList.length + selectedFoldersList.length;
    if (total === 0) return;

    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus ${total} item yang dipilih? Item juga akan dihapus dari Telegram.`
      )
    ) {
      try {
        setIsBatchDeleting(true);
        const promises = [
          ...selectedFilesList.map((f) => deleteFileMutation.mutateAsync(f.id)),
          ...selectedFoldersList.map((fold) => deleteFolderMutation.mutateAsync(fold.id)),
        ];
        await Promise.all(promises);
        handleClearSelection();
      } finally {
        setIsBatchDeleting(false);
      }
    }
  };

  const handleBatchMoveSubmit = (fileIds: string[], targetFolderId: string | null) => {
    for (const id of fileIds) {
      moveFileMutation.mutate({ id, folderId: targetFolderId });
    }
    setMovingFiles([]);
    handleClearSelection();
  };

  // Context Menu Open Handlers
  const handleFileContextMenu = (e: React.MouseEvent, file: VFile, index: number) => {
    // If the right-clicked file is not part of selection, select only this file
    if (!selectedFileIds.has(file.id)) {
      setSelectedFileIds(new Set([file.id]));
      setSelectedFolderIds(new Set());
    }
    setContextMenuState({
      x: e.clientX,
      y: e.clientY,
      target: { type: 'file', file, index },
    });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: VFolder) => {
    if (!selectedFolderIds.has(folder.id)) {
      setSelectedFolderIds(new Set([folder.id]));
      setSelectedFileIds(new Set());
    }
    setContextMenuState({
      x: e.clientX,
      y: e.clientY,
      target: { type: 'folder', folder },
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    if (
      isVaultModalOpen ||
      lightboxFile ||
      isCreateAlbumOpen ||
      renamingFolder ||
      renamingFile ||
      editingCaptionFile ||
      movingFile ||
      movingFiles.length > 0
    ) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    e.preventDefault();
    setContextMenuState({
      x: e.clientX,
      y: e.clientY,
      target: { type: 'canvas' },
    });
  };

  return (
    <div
      onContextMenu={handleCanvasContextMenu}
      className="min-h-screen bg-bg-primary text-text-primary"
    >
      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onUploadClick={handleUploadClick}
        onCreateAlbumClick={() => setIsCreateAlbumOpen(true)}
        onVaultClick={() => setIsVaultModalOpen(true)}
      />

      {/* Hidden file input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        <MemoryGrid
          files={files}
          folders={folders}
          breadcrumbs={breadcrumbs}
          currentFolderId={currentFolderId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          selectedFileIds={selectedFileIds}
          selectedFolderIds={selectedFolderIds}
          onFileSelect={handleFileSelect}
          onFolderSelect={handleFolderSelect}
          onFileDoubleClick={handleFileDoubleClick}
          onFileClick={handleFileClick}
          onUpload={(f) => handleUpload(f, currentFolderId)}
          onFolderOpen={handleFolderNavigate}
          onFolderNavigate={handleFolderNavigate}
          onFolderRename={(folder) => setRenamingFolder(folder)}
          onFolderDelete={handleDeleteAlbum}
          onFolderDropFiles={(droppedFiles, folderId) => handleUpload(droppedFiles, folderId)}
          onCreateAlbum={() => setIsCreateAlbumOpen(true)}
          onFileContextMenu={handleFileContextMenu}
          onFolderContextMenu={handleFolderContextMenu}
          onCanvasContextMenu={handleCanvasContextMenu}
        />
      </main>

      {/* Selection Floating Toolbar */}
      <SelectionToolbar
        selectedFiles={selectedFilesList}
        selectedFolders={selectedFoldersList}
        totalVisibleItems={filteredFiles.length + filteredFolders.length}
        isDownloading={isBatchDownloading}
        isDeleting={isBatchDeleting}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        onBatchDownload={handleBatchDownload}
        onBatchMove={() => setMovingFiles(selectedFilesList)}
        onBatchDelete={handleBatchDelete}
      />

      {/* Custom Context Menu */}
      <ContextMenu
        state={contextMenuState}
        onClose={() => setContextMenuState(null)}
        onOpenFile={(file, idx) => {
          setLightboxFile(file);
          setLightboxIndex(idx);
        }}
        onEditCaption={(file) => setEditingCaptionFile(file)}
        onMoveFile={(file) => setMovingFile(file)}
        onRenameFile={(file) => setRenamingFile(file)}
        onDownloadFile={(file) => downloadFile(file.id)}
        onDeleteFile={(file) => handleDeleteFile(file.id)}
        onOpenFolder={(folderId) => handleFolderNavigate(folderId)}
        onRenameFolder={(folder) => setRenamingFolder(folder)}
        onDeleteFolder={(folder) => handleDeleteAlbum(folder)}
        onUploadToFolder={(folderId) => {
          handleFolderNavigate(folderId);
          setTimeout(() => handleUploadClick(), 100);
        }}
        onCreateAlbum={() => setIsCreateAlbumOpen(true)}
        onUploadCanvas={handleUploadClick}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['directory'] });
          await queryClient.invalidateQueries({ queryKey: ['memories'] });
          await Promise.all([refetchDirectory(), refetchMemories()]);
        }}
        onOpenVault={() => setIsVaultModalOpen(true)}
      />

      {/* Upload Queue */}
      <UploaderPanel />

      {/* Lightbox Modal */}
      {lightboxFile && (
        <LightboxModal
          file={lightboxFile}
          files={filteredFiles}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxFile(null)}
          onNavigate={handleLightboxNavigate}
          onCaptionSave={handleCaptionSave}
          onDelete={handleDeleteFile}
          onMove={(file) => setMovingFile(file)}
        />
      )}

      {/* Aetheria Vault Modal */}
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        user={user}
        files={allMemories.length > 0 ? allMemories : files}
        folders={folders}
        onUploadClick={handleUploadClick}
        onCreateAlbumClick={() => setIsCreateAlbumOpen(true)}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['directory'] });
          await queryClient.invalidateQueries({ queryKey: ['memories'] });
          await Promise.all([refetchDirectory(), refetchMemories()]);
        }}
      />

      {/* Create Album Modal */}
      <CreateAlbumModal
        isOpen={isCreateAlbumOpen}
        onClose={() => setIsCreateAlbumOpen(false)}
        onCreate={handleCreateAlbum}
        isLoading={createFolderMutation.isPending}
      />

      {/* Rename Album Modal */}
      <RenameAlbumModal
        isOpen={renamingFolder !== null}
        folder={renamingFolder}
        onClose={() => setRenamingFolder(null)}
        onRename={handleRenameAlbum}
        isLoading={renameFolderMutation.isPending}
      />

      {/* Rename File Modal */}
      <RenameFileModal
        isOpen={renamingFile !== null}
        file={renamingFile}
        onClose={() => setRenamingFile(null)}
        onRename={handleRenameFile}
        isLoading={renameFileMutation.isPending}
      />

      {/* Edit Caption Modal */}
      <EditCaptionModal
        isOpen={editingCaptionFile !== null}
        file={editingCaptionFile}
        onClose={() => setEditingCaptionFile(null)}
        onSave={handleCaptionSave}
        isLoading={updateCaptionMutation.isPending}
      />

      {/* Single Move File Modal */}
      <MoveFileModal
        isOpen={movingFile !== null}
        file={movingFile}
        folders={folders}
        onClose={() => setMovingFile(null)}
        onMove={handleMoveFile}
        isLoading={moveFileMutation.isPending}
      />

      {/* Batch Move File Modal */}
      <MoveFileModal
        isOpen={movingFiles.length > 0}
        files={movingFiles}
        folders={folders}
        onClose={() => setMovingFiles([])}
        onMove={handleMoveFile}
        onMoveMultiple={handleBatchMoveSubmit}
        isLoading={moveFileMutation.isPending}
      />
    </div>
  );
};
