import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import type { VFile } from '../../domain/types';
import { getFileBlobUrl } from '../../services/api';

interface MemoryCardProps {
  file: VFile;
  index: number;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent, file: VFile) => void;
  onDoubleClickPreview?: (file: VFile, index: number) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, file: VFile, index: number) => void;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const MemoryCard: React.FC<MemoryCardProps> = ({
  file,
  index,
  isSelected = false,
  onSelect,
  onDoubleClickPreview,
  onClick,
  onContextMenu,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const isImage = file.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
  const isVideo = file.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
  const isAudio = file.mimeType?.startsWith('audio/');
  const isPDF = file.mimeType?.includes('pdf');
  const isMedia = isImage || isVideo;

  // Aspect ratio for masonry variety
  const aspectClass = isImage
    ? index % 5 === 0
      ? 'aspect-[3/4]'
      : index % 3 === 0
      ? 'aspect-[4/5]'
      : 'aspect-square'
    : isVideo
    ? 'aspect-video'
    : 'aspect-square';

  useEffect(() => {
    if (!isMedia) return;

    let objectUrl: string | null = null;
    let isMounted = true;

    getFileBlobUrl(file.id)
      .then((url) => {
        if (isMounted) {
          objectUrl = url;
          setPreviewUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => console.error('Failed to load preview:', err));

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, isMedia]);

  // Icon for non-media files
  let iconName = 'draft';
  let iconColor = 'text-accent-warm';
  if (isPDF) { iconName = 'picture_as_pdf'; iconColor = 'text-error'; }
  else if (isAudio) { iconName = 'music_note'; iconColor = 'text-accent-purple'; }

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(e, file);
    } else if (onClick) {
      onClick(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClickPreview?.(file, index);
  };

  return (
    <div
      className="masonry-item stagger-item select-none"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, file, index);
        }}
        className={`memory-card relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-accent-warm shadow-[0_0_25px_rgba(235,160,54,0.35)] scale-[0.985] bg-accent-warm/10'
            : 'bg-bg-secondary border border-border-subtle hover:border-border-default hover:shadow-lg'
        }`}
      >
        {/* Selection Checkbox Badge */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(e, file);
            else if (onClick) onClick(e);
          }}
          className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'bg-accent-warm text-bg-primary shadow-md scale-100 ring-2 ring-accent-warm/50 opacity-100'
              : 'bg-black/40 text-white/70 backdrop-blur-sm border border-white/20 opacity-0 group-hover:opacity-100 hover:scale-110 hover:border-white/50'
          }`}
          title={isSelected ? 'Batalkan pilihan (1x klik)' : 'Pilih kenangan (1x klik)'}
        >
          {isSelected ? (
            <Check size={14} className="stroke-[3]" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full border border-white/60" />
          )}
        </div>

        {/* Thumbnail / Preview */}
        <div className={`relative ${aspectClass} overflow-hidden bg-bg-tertiary`}>
          {previewUrl && isImage ? (
            <img
              src={previewUrl}
              alt={file.name}
              draggable={false}
              onLoad={() => setIsLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            />
          ) : previewUrl && isVideo ? (
            <video
              src={previewUrl}
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setIsLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={`material-symbols-outlined text-[56px] ${iconColor} filled`}>{iconName}</span>
            </div>
          )}

          {/* Video play icon overlay */}
          {isVideo && previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-xl">
                <span className="material-symbols-outlined text-white text-[28px] filled ml-0.5">play_arrow</span>
              </div>
            </div>
          )}

          {/* Shimmer & Spinner loading */}
          {!isLoaded && isMedia && (
            <div className="absolute inset-0 bg-bg-tertiary flex items-center justify-center animate-pulse z-10">
              <div className="w-7 h-7 rounded-full border-2 border-accent-warm/30 border-t-accent-warm animate-spin" />
            </div>
          )}

          {/* Bottom gradient overlay for caption */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Date badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {formatDate(file.createdAt)}
          </div>
        </div>

        {/* Caption overlay at bottom */}
        {file.caption && (
          <div className="px-4 py-3 bg-bg-secondary">
            <p className="text-text-primary text-sm leading-relaxed line-clamp-2">
              {file.caption}
            </p>
            <p className="text-text-muted text-xs mt-1">
              {formatDate(file.createdAt)}
            </p>
          </div>
        )}

        {/* No caption — show filename on hover */}
        {!file.caption && (
          <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-white/80 text-xs font-medium truncate">
              {file.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
