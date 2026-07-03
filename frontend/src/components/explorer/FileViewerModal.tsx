import React, { useState, useEffect } from 'react';
import { VFile } from '../../domain/types';
import { getFileBlobUrl } from '../../services/api';

interface FileViewerModalProps {
  file: VFile;
  onClose: () => void;
  onDownload: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose, onDownload }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl = '';
    getFileBlobUrl(file.id)
      .then((url) => {
        activeUrl = url;
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load file preview:', err);
        setError('Failed to load preview. The file might be unavailable.');
        setIsLoading(false);
      });

    return () => {
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
    };
  }, [file.id]);
  
  // Basic MIME type extraction, though sometimes it might be missing
  const mimeType = file.mimeType || 'application/octet-stream';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-white">
          <span className="material-symbols-outlined text-[64px] mb-4 animate-spin">progress_activity</span>
          <p className="font-medium">Loading preview...</p>
        </div>
      );
    }

    if (error || !blobUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-2xl max-w-sm text-center">
          <span className="material-symbols-outlined text-[64px] mb-4 text-error">error</span>
          <h3 className="text-lg font-bold text-on-surface mb-2">Preview Error</h3>
          <p className="mb-6 font-medium text-sm text-on-surface-variant break-all">
            {error || 'Unknown error occurred'}
          </p>
          <button
            onClick={onDownload}
            className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">download</span>
            Download File
          </button>
        </div>
      );
    }

    if (mimeType.startsWith('image/')) {
      return <img src={blobUrl} alt={file.name} className="max-w-full max-h-[80vh] object-contain rounded-sm" />;
    }
    if (mimeType.startsWith('video/')) {
      return <video src={blobUrl} controls className="max-w-full max-h-[80vh] rounded-sm" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <audio src={blobUrl} controls className="w-full max-w-md" />;
    }
    if (mimeType === 'application/pdf') {
      return <iframe src={blobUrl} className="w-full h-[80vh] bg-white rounded-lg shadow-xl max-w-5xl" title={file.name} />;
    }
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return <iframe src={blobUrl} className="w-full h-[80vh] bg-white rounded-lg shadow-xl max-w-5xl" title={file.name} />;
    }

    // Default fallback
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-2xl max-w-sm text-center">
        <span className="material-symbols-outlined text-[64px] mb-4 text-primary">draft</span>
        <h3 className="text-lg font-bold text-on-surface mb-2">No Preview Available</h3>
        <p className="mb-6 font-medium text-sm text-on-surface-variant break-all">
          {file.name}
        </p>
        <button
          onClick={onDownload}
          className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">download</span>
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 lg:p-8 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-white font-medium truncate max-w-md">{file.name}</div>
        <div className="flex gap-4">
          <button 
            onClick={onDownload} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" 
            title="Download"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </button>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" 
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center w-full h-full pt-16">
        {renderContent()}
      </div>
    </div>
  );
};
