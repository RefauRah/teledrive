import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, Edit2, Trash2, FolderOpen, Check } from 'lucide-react';
import type { VFolder } from '../../domain/types';

interface AlbumCardProps {
  folder: VFolder;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent, folder: VFolder) => void;
  onOpen: (folderId: string) => void;
  onRename: (folder: VFolder) => void;
  onDelete: (folder: VFolder) => void;
  onDropFiles?: (files: File[], folderId: string) => void;
  onContextMenu?: (e: React.MouseEvent, folder: VFolder) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  folder,
  isSelected = false,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onDropFiles,
  onContextMenu,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files), folder.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(e, folder);
    } else {
      onOpen(folder.id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(folder.id);
  };

  const formattedDate = new Date(folder.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, folder);
      }}
      className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl glass-card cursor-pointer transition-all duration-300 select-none ${
        isSelected
          ? 'ring-2 ring-accent-warm bg-accent-warm/15 shadow-[0_0_20px_rgba(235,160,54,0.3)] scale-[0.99]'
          : isDragOver
          ? 'ring-2 ring-accent-warm scale-[1.02] bg-accent-warm/10 shadow-[0_0_20px_rgba(235,160,54,0.3)]'
          : 'hover:scale-[1.01] hover:border-accent-warm/30 hover:shadow-lg'
      }`}
    >
      {/* Selection Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(e, folder);
        }}
        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
          isSelected
            ? 'bg-accent-warm text-bg-primary shadow-sm ring-1 ring-accent-warm'
            : 'bg-bg-tertiary text-text-muted border border-border-subtle opacity-0 group-hover:opacity-100 hover:scale-110'
        }`}
        title={isSelected ? 'Batalkan pilihan (1x klik)' : 'Pilih album (1x klik)'}
      >
        {isSelected ? (
          <Check size={12} className="stroke-[3]" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full border border-text-muted" />
        )}
      </div>

      {/* Folder Icon with warm glow */}
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-warm/20 via-accent-rose/15 to-transparent border border-accent-warm/30 flex items-center justify-center text-accent-warm group-hover:scale-110 transition-transform duration-300 shadow-inner shrink-0">
        <Folder className="w-5 h-5 fill-accent-warm/20" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-text-primary text-base truncate group-hover:text-accent-warm transition-colors">
          {folder.name}
        </h4>
        <p className="text-xs text-text-muted mt-0.5">{formattedDate}</p>
      </div>

      {/* Menu / Action */}
      <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="Opsi Album"
        >
          <MoreVertical size={16} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 glass-strong rounded-xl py-1.5 z-30 animate-fade-in-scale shadow-2xl border border-border-default">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpen(folder.id);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary/60 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <FolderOpen size={14} className="text-accent-warm" />
              Buka Album
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onRename(folder);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary/60 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Edit2 size={14} className="text-text-muted" />
              Ubah Nama
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onDelete(folder);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-error hover:bg-error/10 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Hapus Album
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
