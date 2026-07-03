import React, { useState, useEffect } from 'react';
import { formatBytes } from '../../utils/formatters';
import { getFileBlobUrl } from '../../services/api';

interface FileCardProps {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  mimeType?: string;
  isStarred?: boolean;
  modifiedAt?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  id,
  name,
  type,
  size,
  mimeType,
  isStarred = false,
  isSelected,
  onSelect,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();
  };

  // Determine file type styling
  const isPDF = mimeType?.includes('pdf') || name.endsWith('.pdf');
  const isImage = mimeType?.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(name);
  const isVideo = mimeType?.includes('video');
  const isDoc = mimeType?.includes('document') || mimeType?.includes('word') || name.endsWith('.docx');
  const isZip = mimeType?.includes('zip') || name.endsWith('.zip');

  let iconName = 'draft';
  let iconColor = 'text-surface-tint';
  let gradientColor = 'from-surface-tint/5';

  if (isPDF) {
    iconName = 'picture_as_pdf';
    iconColor = 'text-error';
    gradientColor = 'from-error/5';
  } else if (isImage) {
    iconName = 'image';
    iconColor = 'text-tertiary';
    gradientColor = 'from-tertiary/5';
  } else if (isDoc) {
    iconName = 'description';
    iconColor = 'text-surface-tint';
    gradientColor = 'from-surface-tint/5';
  } else if (isVideo) {
    iconName = 'movie';
    iconColor = 'text-warning';
    gradientColor = 'from-warning/5';
  } else if (isZip) {
    iconName = 'folder_zip';
    iconColor = 'text-primary';
    gradientColor = 'from-primary/5';
  }

  // Fetch image preview
  useEffect(() => {
    if (!isImage || type !== 'file') return;

    let objectUrl: string | null = null;
    let isMounted = true;

    getFileBlobUrl(id)
      .then((url) => {
        if (isMounted) {
          objectUrl = url;
          setPreviewUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => console.error('Failed to load image preview:', err));

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, isImage, type]);

  if (type === 'folder') {
    return (
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
        onDragStart={(e) => e.preventDefault()}
        className={`relative bg-surface-container-lowest border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'} rounded-[16px] p-4 flex items-center gap-3 cursor-pointer ambient-shadow-hover group transition-all`}
      >
        {/* Checkbox Overlay for Selection */}
        <div 
          className={`absolute top-3 right-3 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
        >
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => {}} // Controlled via parent
            className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer bg-white"
          />
        </div>

        <div className="w-10 h-10 rounded-[8px] bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder
          </span>
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h4 className="font-headline-md text-headline-md text-on-surface truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span>Folder</span>
            {isStarred && (
              <span className="material-symbols-outlined text-[14px] text-amber-500 filled" title="Starred">
                star
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // File Card
  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={(e) => e.preventDefault()}
      className={`bg-surface-container-lowest border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/30'} rounded-xl overflow-hidden flex flex-col h-[220px] cursor-pointer ambient-shadow-hover relative group transition-all`}
    >
      {/* Checkbox Overlay for Selection */}
      <div 
        className={`absolute top-2 right-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
      >
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => {}} // Controlled via parent
          className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer bg-white"
        />
      </div>

      {/* Thumbnail Area */}
      <div className="h-32 bg-surface-container flex items-center justify-center relative overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt={name} draggable={false} className="w-full h-full object-cover animate-in fade-in duration-300" />
        ) : (
          <span className={`material-symbols-outlined text-[48px] ${iconColor}`}>{iconName}</span>
        )}
        {/* subtle gradient overlay to suggest a document preview */}
        {!previewUrl && <div className={`absolute inset-0 bg-gradient-to-tr ${gradientColor} to-transparent`}></div>}
      </div>

      {/* Metadata Area */}
      <div className="p-4 flex-1 flex flex-col justify-center border-t border-outline-variant/20">
        <div className="flex items-start gap-3">
          <span className={`material-symbols-outlined text-[24px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {iconName}
          </span>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface truncate w-[160px] group-hover:text-primary transition-colors" title={name}>
              {name}
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
              <span>{size !== undefined ? formatBytes(size) : 'Folder'}</span>
              {isStarred && (
                <span className="material-symbols-outlined text-[14px] text-amber-500 filled" title="Starred">
                  star
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
