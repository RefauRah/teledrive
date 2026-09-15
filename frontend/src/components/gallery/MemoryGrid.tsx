import React from 'react';
import { useDropzone } from 'react-dropzone';
import type { VFile, VFolder, BreadcrumbItem } from '../../domain/types';
import { MemoryCard } from './MemoryCard';
import { AlbumCard } from './AlbumCard';
import { Breadcrumbs } from './Breadcrumbs';
import { Heart, FolderHeart, Sparkles } from 'lucide-react';

interface MemoryGridProps {
  files: VFile[];
  folders: VFolder[];
  breadcrumbs: BreadcrumbItem[];
  currentFolderId: string | null;
  isLoading: boolean;
  searchQuery: string;
  selectedFileIds?: Set<string>;
  selectedFolderIds?: Set<string>;
  onFileSelect?: (e: React.MouseEvent, file: VFile) => void;
  onFolderSelect?: (e: React.MouseEvent, folder: VFolder) => void;
  onFileDoubleClick?: (file: VFile, index: number) => void;
  onFileClick: (file: VFile, index: number) => void;
  onUpload: (files: File[]) => void;
  onFolderOpen: (folderId: string) => void;
  onFolderNavigate: (folderId: string | null) => void;
  onFolderRename: (folder: VFolder) => void;
  onFolderDelete: (folder: VFolder) => void;
  onFolderDropFiles: (files: File[], folderId: string) => void;
  onCreateAlbum: () => void;
  onFileContextMenu?: (e: React.MouseEvent, file: VFile, index: number) => void;
  onFolderContextMenu?: (e: React.MouseEvent, folder: VFolder) => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
}

export const MemoryGrid: React.FC<MemoryGridProps> = ({
  files,
  folders,
  breadcrumbs,
  currentFolderId,
  isLoading,
  searchQuery,
  selectedFileIds = new Set(),
  selectedFolderIds = new Set(),
  onFileSelect,
  onFolderSelect,
  onFileDoubleClick,
  onFileClick,
  onUpload,
  onFolderOpen,
  onFolderNavigate,
  onFolderRename,
  onFolderDelete,
  onFolderDropFiles,
  onCreateAlbum,
  onFileContextMenu,
  onFolderContextMenu,
  onCanvasContextMenu,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    noClick: true,
  });

  const filteredFolders = searchQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;

  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

  return (
    <div
      {...getRootProps()}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onCanvasContextMenu?.(e);
        }
      }}
      className="canvas-area relative flex-1 min-h-[calc(100vh-5rem)] outline-none px-4 sm:px-6 lg:px-8 py-4"
    >
      <input {...getInputProps()} />

      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        breadcrumbs={breadcrumbs}
        currentFolderId={currentFolderId}
        onNavigate={onFolderNavigate}
        onCreateAlbum={onCreateAlbum}
      />

      {/* Drag & Drop Overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/90 backdrop-blur-md animate-fade-in">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 rounded-3xl gradient-warm flex items-center justify-center animate-float">
              <span className="material-symbols-outlined text-white text-[48px] filled">cloud_upload</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Letakkan file di sini
              </h2>
              <p className="text-text-secondary">
                {currentFolderId ? 'Upload ke album ini' : 'Upload foto, video, dan media kenangan'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-bg-secondary border border-border-subtle animate-pulse" />
            ))}
          </div>
          <div className="masonry-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="masonry-item">
                <div
                  className="rounded-2xl bg-bg-secondary border border-border-subtle animate-pulse"
                  style={{ height: `${180 + (i % 3) * 60}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && isEmpty && (
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            onCanvasContextMenu?.(e);
          }}
          className="flex-1 flex flex-col items-center justify-center text-center py-24 px-6 select-none"
        >
          <div className="w-20 h-20 rounded-3xl gradient-warm-subtle flex items-center justify-center mb-6 shadow-inner">
            <Heart size={36} className="text-accent-rose" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            {searchQuery
              ? 'Tidak ada hasil ditemukan'
              : currentFolderId
              ? 'Album ini masih kosong'
              : 'Belum ada kenangan tersimpan'}
          </h2>
          <p className="text-text-secondary max-w-sm leading-relaxed mb-6">
            {searchQuery
              ? `Tidak ditemukan album atau media dengan kata kunci "${searchQuery}"`
              : currentFolderId
              ? 'Mulai isi album ini dengan mengunggah foto, video, atau drag & drop file langsung ke sini.'
              : 'Mulai simpan momen berhargamu di Aetheria! Klik kanan di mana saja untuk menu cepat atau klik tombol upload.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCreateAlbum}
              className="px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-default text-sm font-semibold transition-all cursor-pointer shadow-sm hover:border-accent-warm/30"
            >
              + Buat Album
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isEmpty && (
        <div className="space-y-8 pt-2">
          {/* Albums Section */}
          {filteredFolders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3.5 px-1">
                <FolderHeart className="w-5 h-5 text-accent-warm" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Album ({filteredFolders.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredFolders.map((folder) => (
                  <AlbumCard
                    key={folder.id}
                    folder={folder}
                    isSelected={selectedFolderIds.has(folder.id)}
                    onSelect={onFolderSelect}
                    onOpen={onFolderOpen}
                    onRename={onFolderRename}
                    onDelete={onFolderDelete}
                    onDropFiles={onFolderDropFiles}
                    onContextMenu={onFolderContextMenu}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files / Memories Section */}
          {filteredFiles.length > 0 && (
            <div>
              {filteredFolders.length > 0 && (
                <div className="flex items-center gap-2 mb-3.5 px-1 border-t border-border-subtle/30 pt-6">
                  <Sparkles className="w-5 h-5 text-accent-rose" />
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    Media & Foto ({filteredFiles.length})
                  </h3>
                </div>
              )}
              <div className="masonry-grid">
                {filteredFiles.map((file, index) => (
                  <MemoryCard
                    key={file.id}
                    file={file}
                    index={index}
                    isSelected={selectedFileIds.has(file.id)}
                    onSelect={onFileSelect}
                    onDoubleClickPreview={onFileDoubleClick || onFileClick}
                    onClick={() => {
                      if (onFileSelect) {
                        // handled by onSelect
                      } else {
                        onFileClick(file, index);
                      }
                    }}
                    onContextMenu={onFileContextMenu}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
