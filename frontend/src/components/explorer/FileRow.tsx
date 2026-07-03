import React from 'react';
import { VFile, VFolder } from '../../domain/types';

interface FileRowProps {
  item: VFolder | VFile;
  type: 'folder' | 'file';
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileIconSymbol = (mimeType: string, extension: string) => {
  const ext = extension.toUpperCase();
  if (mimeType.startsWith('image/')) {
    return <span className="material-symbols-outlined text-[#bc4800] text-[20px] filled">image</span>;
  }
  if (mimeType.startsWith('video/')) {
    return <span className="material-symbols-outlined text-primary text-[20px] filled">video_file</span>;
  }
  if (mimeType.includes('pdf')) {
    return <span className="material-symbols-outlined text-error text-[20px] filled">picture_as_pdf</span>;
  }
  if (mimeType.includes('document') || mimeType.includes('text') || ext === 'DOCX' || ext === 'TXT') {
    return <span className="material-symbols-outlined text-[#0053db] text-[20px] filled">description</span>;
  }
  if (ext === 'ZIP' || ext === 'RAR' || ext === '7Z' || ext === 'TAR' || ext === 'GZ') {
    return <span className="material-symbols-outlined text-warning text-[20px] filled">folder_zip</span>;
  }
  return <span className="material-symbols-outlined text-on-surface-variant text-[20px] filled">draft</span>;
};

export const FileRow: React.FC<FileRowProps> = ({
  item,
  type,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const isFolder = type === 'folder';
  const file = item as VFile;
  const ext = isFolder ? '' : item.name.split('.').pop() || '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e);
  };

  return (
    <tr
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
      className={`border-b border-outline-variant/60 cursor-pointer select-none transition-all duration-150 ${
        selected
          ? 'bg-primary-container/10'
          : 'hover:bg-surface-container-low'
      }`}
    >
      {/* Checkbox / Selection Indicator */}
      <td className="w-10 pl-4 py-3 text-center">
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
            selected
              ? 'bg-primary border-primary text-white'
              : 'border-outline-variant hover:border-outline'
          }`}
        >
          {selected && (
            <svg
              className="w-2.5 h-2.5 fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </div>
      </td>

      {/* Name and Icon */}
      <td className="py-3 px-4 flex items-center gap-3 font-semibold text-on-surface">
        <span className="p-1 rounded bg-surface-container-low border border-outline-variant flex items-center justify-center">
          {isFolder ? (
            <span className="material-symbols-outlined text-primary text-[20px] filled">folder</span>
          ) : (
            getFileIconSymbol(file.mimeType, ext)
          )}
        </span>
        <span className="truncate max-w-md flex items-center gap-1.5" title={item.name}>
          <span className="truncate">{item.name}</span>
          {item.isStarred && (
            <span className="material-symbols-outlined text-[16px] text-amber-500 filled" title="Starred">
              star
            </span>
          )}
        </span>
      </td>

      {/* Type */}
      <td className="py-3 px-4 text-sm text-on-surface-variant font-medium hidden md:table-cell">
        {isFolder ? 'Folder' : ext.toUpperCase() || 'File'}
      </td>

      {/* Size */}
      <td className="py-3 px-4 text-sm text-on-surface-variant font-medium">
        {isFolder ? '--' : formatBytes(file.size)}
      </td>

      {/* Modified Date */}
      <td className="py-3 px-4 text-sm text-on-surface-variant font-medium hidden lg:table-cell">
        {formatDate(item.updatedAt)}
      </td>
    </tr>
  );
};
