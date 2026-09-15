import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  MessageSquare,
  FolderInput,
  Edit2,
  Download,
  Trash2,
  FolderOpen,
  FolderPlus,
  Upload,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { VFile, VFolder } from '../../domain/types';

export type ContextMenuTarget =
  | { type: 'file'; file: VFile; index: number }
  | { type: 'folder'; folder: VFolder }
  | { type: 'canvas' };

export interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}

interface ContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onOpenFile?: (file: VFile, index: number) => void;
  onEditCaption?: (file: VFile) => void;
  onMoveFile?: (file: VFile) => void;
  onRenameFile?: (file: VFile) => void;
  onDownloadFile?: (file: VFile) => void;
  onDeleteFile?: (file: VFile) => void;
  onOpenFolder?: (folderId: string) => void;
  onRenameFolder?: (folder: VFolder) => void;
  onDeleteFolder?: (folder: VFolder) => void;
  onUploadToFolder?: (folderId: string) => void;
  onCreateAlbum?: () => void;
  onUploadCanvas?: () => void;
  onRefresh?: () => void;
  onOpenVault?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onOpenFile,
  onEditCaption,
  onMoveFile,
  onRenameFile,
  onDownloadFile,
  onDeleteFile,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  onUploadToFolder,
  onCreateAlbum,
  onUploadCanvas,
  onRefresh,
  onOpenVault,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!state) return;

    // Viewport boundary check to keep menu within screen bounds
    const menuWidth = 240;
    const menuHeight = 320;
    const padding = 12;

    let nextX = state.x;
    let nextY = state.y;

    if (nextX + menuWidth > window.innerWidth - padding) {
      nextX = window.innerWidth - menuWidth - padding;
    }
    if (nextY + menuHeight > window.innerHeight - padding) {
      nextY = window.innerHeight - menuHeight - padding;
    }

    setAdjustedPos({
      x: Math.max(padding, nextX),
      y: Math.max(padding, nextY),
    });
  }, [state]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = () => onClose();

    if (state) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [state, onClose]);

  if (!state) return null;

  const { target } = state;

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedPos.x}px`, top: `${adjustedPos.y}px` }}
      className="fixed z-[999] w-60 glass-strong rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-border-default/80 animate-fade-in-scale select-none backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ─── FILE CONTEXT MENU ─── */}
      {target.type === 'file' && (
        <div className="space-y-0.5">
          <div className="px-3 py-1.5 border-b border-border-subtle/50 mb-1">
            <p className="text-xs font-bold text-text-primary truncate">{target.file.name}</p>
            <p className="text-[11px] text-text-muted truncate">
              {target.file.caption ? target.file.caption : 'Media file'}
            </p>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenFile?.(target.file, target.index);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Eye size={15} className="text-accent-warm group-hover:scale-110 transition-transform" />
              <span>Buka Pratinjau</span>
            </div>
            <span className="text-[10px] text-text-muted font-mono">Enter</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onEditCaption?.(target.file);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <MessageSquare size={15} className="text-accent-purple group-hover:scale-110 transition-transform" />
            <span>{target.file.caption ? 'Edit Caption' : 'Tambah Caption'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onMoveFile?.(target.file);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <FolderInput size={15} className="text-accent-warm/80 group-hover:scale-110 transition-transform" />
            <span>Pindahkan ke Album</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRenameFile?.(target.file);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <Edit2 size={15} className="text-text-muted group-hover:scale-110 transition-transform" />
            <span>Ubah Nama File</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onDownloadFile?.(target.file);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <Download size={15} className="text-text-muted group-hover:scale-110 transition-transform" />
            <span>Unduh File</span>
          </button>

          <div className="border-t border-border-subtle/50 my-1 pt-1">
            <button
              onClick={() => {
                onClose();
                onDeleteFile?.(target.file);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-error hover:bg-error/15 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
                <span>Hapus Media</span>
              </div>
              <span className="text-[10px] text-error/70 font-mono">Del</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── FOLDER CONTEXT MENU ─── */}
      {target.type === 'folder' && (
        <div className="space-y-0.5">
          <div className="px-3 py-1.5 border-b border-border-subtle/50 mb-1">
            <p className="text-xs font-bold text-text-primary truncate">{target.folder.name}</p>
            <p className="text-[11px] text-text-muted">Album Koleksi</p>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenFolder?.(target.folder.id);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <FolderOpen size={15} className="text-accent-warm group-hover:scale-110 transition-transform" />
            <span>Buka Album</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onUploadToFolder?.(target.folder.id);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <Upload size={15} className="text-accent-rose group-hover:scale-110 transition-transform" />
            <span>Upload ke Album ini</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRenameFolder?.(target.folder);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <Edit2 size={15} className="text-text-muted group-hover:scale-110 transition-transform" />
            <span>Ubah Nama Album</span>
          </button>

          <div className="border-t border-border-subtle/50 my-1 pt-1">
            <button
              onClick={() => {
                onClose();
                onDeleteFolder?.(target.folder);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-error hover:bg-error/15 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
            >
              <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
              <span>Hapus Album</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── CANVAS CONTEXT MENU ─── */}
      {target.type === 'canvas' && (
        <div className="space-y-0.5">
          {/* Aetheria Vault Header Button */}
          <button
            onClick={() => {
              onClose();
              onOpenVault?.();
            }}
            className="w-full px-3 py-2 text-left rounded-xl bg-gradient-to-r from-accent-warm/15 via-accent-rose/10 to-transparent hover:from-accent-warm/25 hover:to-accent-rose/20 border border-accent-warm/30 flex items-center justify-between transition-all group mb-1.5 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-accent-warm group-hover:scale-110 transition-transform animate-pulse" />
              <div>
                <p className="text-xs font-bold text-text-primary leading-none">Aetheria Vault</p>
                <p className="text-[10px] text-accent-warm/90 mt-0.5">Status & Info Cloud</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-accent-warm/70 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => {
              onClose();
              onCreateAlbum?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <FolderPlus size={15} className="text-accent-warm group-hover:scale-110 transition-transform" />
            <span>Buat Album Baru</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onUploadCanvas?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <Upload size={15} className="text-accent-rose group-hover:scale-110 transition-transform" />
            <span>Upload Media</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRefresh?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:text-accent-warm hover:bg-accent-warm/10 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <RefreshCw size={15} className="text-text-muted group-hover:scale-110 transition-transform" />
            <span>Segarkan Galeri</span>
          </button>
        </div>
      )}
    </div>
  );
};
