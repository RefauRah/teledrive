import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Trash2, ChevronLeft, ChevronRight, FolderInput } from 'lucide-react';
import type { VFile } from '../../domain/types';
import { getFileBlobUrl, downloadFile } from '../../services/api';

interface LightboxModalProps {
  file: VFile;
  files: VFile[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onCaptionSave: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
  onMove?: (file: VFile) => void;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const LightboxModal: React.FC<LightboxModalProps> = ({
  file,
  files,
  currentIndex,
  onClose,
  onNavigate,
  onCaptionSave,
  onDelete,
  onMove,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [caption, setCaption] = useState(file.caption || '');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mimeType = file.mimeType || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
  const isAudio = mimeType.startsWith('audio/');

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  // Load blob
  useEffect(() => {
    setIsLoading(true);
    setBlobUrl(null);
    let activeUrl = '';

    getFileBlobUrl(file.id)
      .then((url) => {
        activeUrl = url;
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load media:', err);
        setIsLoading(false);
      });

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [file.id]);

  // Sync caption when file changes
  useEffect(() => {
    setCaption(file.caption || '');
    setIsEditingCaption(false);
  }, [file.id, file.caption]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingCaption) return; // Don't intercept while typing

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, currentIndex, isEditingCaption, onClose, onNavigate]);

  // Auto-hide controls
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (!isEditingCaption) {
      controlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [isEditingCaption]);

  const handleCaptionSave = () => {
    onCaptionSave(file.id, caption);
    setIsEditingCaption(false);
  };

  const handleDownload = () => {
    downloadFile(file.id);
  };

  // Render media content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent-warm border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm font-medium">Memuat kenangan...</p>
        </div>
      );
    }

    if (!blobUrl) {
      return (
        <div className="text-center text-text-muted">
          <p className="text-base font-semibold mb-1">Gagal memuat media</p>
          <p className="text-xs">File mungkin tidak dapat diakses saat ini</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <img
          src={blobUrl}
          alt={file.name}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg lightbox-enter shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={blobUrl}
          controls
          autoPlay
          playsInline
          className="max-h-[80vh] max-w-[90vw] rounded-lg lightbox-enter shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center gap-6 p-8 glass rounded-2xl max-w-md w-full lightbox-enter">
          <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white text-[36px]">music_note</span>
          </div>
          <p className="text-text-primary font-semibold text-lg truncate max-w-full">{file.name}</p>
          <audio src={blobUrl} controls className="w-full" autoPlay />
        </div>
      );
    }

    // Default document/other
    return (
      <div className="flex flex-col items-center gap-4 p-8 glass rounded-2xl max-w-sm text-center lightbox-enter">
        <span className="material-symbols-outlined text-[48px] text-accent-warm">draft</span>
        <p className="text-text-primary font-medium">{file.name}</p>
        <button
          onClick={handleDownload}
          className="px-6 py-2.5 gradient-warm rounded-xl text-white font-medium btn-press flex items-center gap-2"
        >
          <Download size={16} />
          Download
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 lightbox-backdrop"
      onMouseMove={resetControlsTimer}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors btn-press"
          >
            <X size={20} />
          </button>
          <div className="hidden sm:block">
            <p className="text-white/90 text-sm font-medium truncate max-w-xs">{file.name}</p>
            <p className="text-white/50 text-xs">{formatDate(file.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onMove && (
            <button
              onClick={() => onMove(file)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors btn-press"
              title="Pindahkan ke Album"
            >
              <FolderInput size={18} />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors btn-press"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => onDelete(file.id)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-white hover:text-red-400 transition-colors btn-press"
            title="Hapus"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all btn-press ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all btn-press ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Media content */}
      <div className="flex-1 flex items-center justify-center px-16 py-20">
        {renderContent()}
      </div>

      {/* Caption area at bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-2xl mx-auto">
          {isEditingCaption ? (
            <div className="flex flex-col gap-3">
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tulis kenangan di sini..."
                rows={2}
                autoFocus
                className="caption-input text-sm leading-relaxed w-full bg-white/5 rounded-xl px-4 py-3 border border-white/10 focus:border-accent-warm/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCaptionSave();
                  }
                  if (e.key === 'Escape') {
                    setCaption(file.caption || '');
                    setIsEditingCaption(false);
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setCaption(file.caption || '');
                    setIsEditingCaption(false);
                  }}
                  className="px-4 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCaptionSave}
                  className="px-4 py-1.5 text-sm gradient-warm rounded-lg text-white font-medium btn-press"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditingCaption(true);
                setShowControls(true);
                if (controlsTimer.current) clearTimeout(controlsTimer.current);
              }}
              className="text-left w-full group"
            >
              {caption ? (
                <p className="text-white text-base leading-relaxed group-hover:text-accent-warm transition-colors">
                  {caption}
                </p>
              ) : (
                <p className="text-white/40 text-sm italic group-hover:text-white/70 transition-colors">
                  + Tambahkan caption kenangan...
                </p>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
