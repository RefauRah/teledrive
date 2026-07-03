import React, { useEffect, useRef } from 'react';
import { Download, Edit2, FolderOpen, Move, Trash2, Star } from 'lucide-react';
import { VFile, VFolder } from '../../domain/types';

interface ContextMenuProps {
  x: number;
  y: number;
  type: 'file' | 'folder';
  item: VFolder | VFile;
  onClose: () => void;
  onOpen?: () => void;
  onDownload?: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onToggleStar?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  type,
  item,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onRestore,
  onToggleStar,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isFolder = type === 'folder';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates if the menu goes off-screen
  let adjustedX = x;
  let adjustedY = y;
  const menuWidth = 180;
  const menuHeight = onRestore ? 100 : 220;

  if (window.innerWidth < x + menuWidth) {
    adjustedX = x - menuWidth;
  }
  if (window.innerHeight < y + menuHeight) {
    adjustedY = y - menuHeight;
  }

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-44 rounded-xl border border-border-glass bg-bg-secondary/90 backdrop-blur-md p-1.5 shadow-2xl shadow-bg-primary/95 text-text-primary flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Name Header */}
      <div className="px-2.5 py-1.5 text-xs text-text-muted font-medium border-b border-border-glass/40 mb-1 truncate" title={item.name}>
        {item.name}
      </div>

      {onRestore ? (
        <>
          <button
            onClick={() => {
              onRestore();
              onClose();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
            Restore
          </button>
          <div className="h-px bg-border-glass/40 my-1" />
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg text-error hover:bg-error/10 transition-all text-left font-medium w-full"
          >
            <Trash2 size={16} />
            Delete Permanently
          </button>
        </>
      ) : (
        <>
          {isFolder && onOpen && (
            <button
              onClick={() => {
                onOpen();
                onClose();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
            >
              <FolderOpen size={16} />
              Open
            </button>
          )}

          {!isFolder && onDownload && (
            <button
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
            >
              <Download size={16} />
              Download
            </button>
          )}

          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
          >
            <Edit2 size={16} />
            Rename
          </button>

          <button
            onClick={() => {
              onMove();
              onClose();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
          >
            <Move size={16} />
            Move to
          </button>

          {onToggleStar && (
            <button
              onClick={() => {
                onToggleStar();
                onClose();
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary transition-all text-left font-medium w-full"
            >
              <Star size={16} className={item.isStarred ? "fill-amber-500 text-amber-500" : ""} />
              {item.isStarred ? 'Unstar' : 'Star'}
            </button>
          )}



          <div className="h-px bg-border-glass/40 my-1" />

          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg text-error hover:bg-error/10 transition-all text-left font-medium w-full"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </>
      )}
    </div>
  );
};
