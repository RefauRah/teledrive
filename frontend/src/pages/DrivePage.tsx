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
import { ConfirmModal } from '../components/gallery/ConfirmModal';
import { ShareModal } from '../components/share/ShareModal';
import { SelectionToolbar } from '../components/gallery/SelectionToolbar';
import { ContextMenu, type ContextMenuState } from '../components/gallery/ContextMenu';
import { MobileNav } from '../components/layout/MobileNav';
import { UploaderPanel } from '../components/upload/UploaderPanel';
import { useViewModeStore } from '../stores/useViewModeStore';
import { Monitor } from 'lucide-react';
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
  const { viewMode, toggleViewMode, isMobileDevice } = useViewModeStore();
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

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Context Menu state
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);

  // Modals state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<{ item: VFile | VFolder; type: 'file' | 'folder' } | null>(null);
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
    const targetFile = files.find((f) => f.id === id) || allMemories.find((f) => f.id === id);
    const fileName = targetFile?.name || 'media ini';
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Kenangan?',
      message: `Apakah Anda yakin ingin menghapus "${fileName}"?`,
      confirmLabel: 'Hapus Kenangan',
      isDanger: true,
      onConfirm: async () => {
        await deleteFileMutation.mutateAsync(id);
        setLightboxFile(null);
        setConfirmDialog(null);
      },
    });
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
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Album?',
      message: `Apakah Anda yakin ingin menghapus album "${folder.name}"? Seluruh foto dan media di dalamnya juga akan terhapus.`,
      confirmLabel: 'Hapus Album',
      isDanger: true,
      onConfirm: async () => {
        await deleteFolderMutation.mutateAsync(folder.id);
        setConfirmDialog(null);
      },
    });
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

  const handleBatchDelete = () => {
    const total = selectedFilesList.length + selectedFoldersList.length;
    if (total === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `Hapus ${total} Item Terpilih?`,
      message: `Apakah Anda yakin ingin menghapus ${total} item yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: `Hapus ${total} Item`,
      isDanger: true,
      onConfirm: async () => {
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
          setConfirmDialog(null);
        }
      },
    });
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
      className={
        viewMode === 'mobile' && !isMobileDevice
          ? 'min-h-screen bg-[#07070a] flex flex-col items-center justify-center p-3 sm:p-6 relative'
          : 'min-h-screen bg-bg-primary text-text-primary'
      }
    >
      {/* Floating Desktop Switcher Pill (Only in simulated mobile on desktop) */}
      {viewMode === 'mobile' && !isMobileDevice && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <button
            onClick={toggleViewMode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-bg-secondary/90 hover:bg-bg-tertiary border border-border-default hover:border-accent-warm/40 text-text-primary text-xs font-bold transition-all shadow-2xl cursor-pointer backdrop-blur-xl group"
            title="Kembali ke Mode Desktop Layar Penuh"
          >
            <Monitor size={15} className="text-accent-rose group-hover:scale-110 transition-transform" />
            <span>Mode Desktop</span>
          </button>
        </div>
      )}

      {/* Main Container: Phone Mockup (if on desktop) or Full-Bleed View (if mobile / desktop mode) */}
      <div
        className={
          viewMode === 'mobile' && !isMobileDevice
            ? 'w-full max-w-[420px] h-[850px] max-h-[92vh] bg-bg-primary text-text-primary rounded-[38px] border-[5px] border-[#22222c] shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(245,158,11,0.06)] overflow-hidden flex flex-col relative'
            : viewMode === 'mobile'
            ? 'w-full min-h-screen bg-bg-primary text-text-primary relative pb-20'
            : 'w-full min-h-screen'
        }
      >
        {/* Phone Notch (Only for simulated phone frame on desktop) */}
        {viewMode === 'mobile' && !isMobileDevice && (
          <div className="w-24 h-3.5 bg-[#22222c] rounded-b-xl mx-auto shrink-0 flex items-center justify-center">
            <div className="w-8 h-1 rounded-full bg-[#333340]" />
          </div>
        )}

        {/* Scrollable screen container for phone simulator, or normal flow */}
        <div
          className={
            viewMode === 'mobile' && !isMobileDevice
              ? 'flex-1 overflow-y-auto no-scrollbar relative flex flex-col'
              : 'w-full'
          }
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
          <main
            className={
              viewMode === 'mobile'
                ? 'px-3 py-2 flex-1'
                : 'max-w-7xl mx-auto min-h-[calc(100vh-4rem)]'
            }
          >
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
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {viewMode === 'mobile' && (
          <MobileNav
            onHomeClick={() => handleFolderNavigate(null)}
            onCreateAlbumClick={() => setIsCreateAlbumOpen(true)}
            onUploadClick={handleUploadClick}
            onVaultClick={() => setIsVaultModalOpen(true)}
            onProfileClick={() => setIsVaultModalOpen(true)}
          />
        )}
      </div>

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
        onShareFile={(file) => setSharingItem({ item: file, type: 'file' })}
        onEditCaption={(file) => setEditingCaptionFile(file)}
        onMoveFile={(file) => setMovingFile(file)}
        onRenameFile={(file) => setRenamingFile(file)}
        onDownloadFile={(file) => downloadFile(file.id)}
        onDeleteFile={(file) => handleDeleteFile(file.id)}
        onOpenFolder={(folderId) => handleFolderNavigate(folderId)}
        onShareFolder={(folder) => setSharingItem({ item: folder, type: 'folder' })}
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
          onShare={(file) => setSharingItem({ item: file, type: 'file' })}
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

      {/* Custom Confirm Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          isDanger={confirmDialog.isDanger}
          isLoading={isBatchDeleting || deleteFolderMutation.isPending || deleteFileMutation.isPending}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={sharingItem !== null}
        onClose={() => setSharingItem(null)}
        item={sharingItem?.item ?? null}
        type={sharingItem?.type ?? 'file'}
      />
    </div>
  );
};
