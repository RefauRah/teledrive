import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Loader2, CheckCircle2, XCircle, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { useUploadStore } from '../../stores/useUploadStore';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '../../services/api';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const UploaderPanel: React.FC = () => {
  const { uploads, removeFile, retryFile, clearCompleted, updateProgress, updateStatus } = useUploadStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const uploadList = Array.from(uploads.values());

  useEffect(() => {
    const hasUploading = uploadList.some(u => u.status === 'uploading' || u.status === 'pending');
    if (hasUploading && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [uploads, isCollapsed]);

  useEffect(() => {
    const successCount = uploadList.filter(u => u.status === 'success').length;
    const uploadingCount = uploadList.filter(u => u.status === 'uploading' || u.status === 'pending').length;
    const failedCount = uploadList.filter(u => u.status === 'failed').length;
    
    let timeout: ReturnType<typeof setTimeout>;
    // Only auto-dismiss completed files when nothing is uploading and no items failed
    if (uploadingCount === 0 && failedCount === 0 && successCount > 0) {
      timeout = setTimeout(() => {
        clearCompleted();
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [uploads, clearCompleted]);

  useEffect(() => {
    const activeUpload = uploadList.find(u => u.status === 'uploading');
    if (activeUpload) return;

    const pendingItem = uploadList.find(u => u.status === 'pending');
    if (!pendingItem) return;

    const runUpload = async () => {
      updateStatus(pendingItem.id, 'uploading');
      
      try {
        await uploadFile(
          pendingItem.file,
          pendingItem.folderId,
          (progress) => {
            updateProgress(pendingItem.id, progress);
          },
          pendingItem.abortController.signal
        );

        updateStatus(pendingItem.id, 'success');
        queryClient.invalidateQueries({ queryKey: ['directory'] });
        queryClient.invalidateQueries({ queryKey: ['memories'] });
        queryClient.refetchQueries({ queryKey: ['directory'] });
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.error('File upload failed:', err);

        let errMsg = 'Upload gagal';
        if (err.response?.status === 413) {
          errMsg = 'Batas ukuran request terlampaui (Error 413 Payload Too Large). Jika di-deploy di Vercel Serverless, terdapat batasan upload 4.5MB. Jalankan di server Node.js/Docker untuk upload hingga 2GB.';
        } else if (typeof err.response?.data?.error === 'string') {
          errMsg = err.response.data.error;
        } else if (typeof err.response?.data?.message === 'string') {
          errMsg = err.response.data.message;
        } else if (typeof err.response?.data === 'string' && err.response.data.trim()) {
          errMsg = err.response.data.replace(/<[^>]*>?/gm, '').slice(0, 150);
        } else if (typeof err.message === 'string') {
          errMsg = err.message;
        }

        updateStatus(pendingItem.id, 'failed', errMsg);
      }
    };

    runUpload();
  }, [uploads, queryClient]);

  if (uploadList.length === 0) return null;

  const uploadingCount = uploadList.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const successCount = uploadList.filter(u => u.status === 'success').length;
  const failedCount = uploadList.filter(u => u.status === 'failed').length;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 rounded-2xl glass-strong shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-elevated/50">
        <div className="flex items-center gap-2 text-text-primary">
          <Upload size={16} className="text-accent-warm" />
          <span className="font-bold text-sm">
            {uploadingCount > 0
              ? `Mengupload ${uploadingCount} file...`
              : 'Upload selesai'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary">
          {successCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-success/15 text-success font-semibold">
              {successCount} Berhasil
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-error/15 text-error font-semibold">
              {failedCount} Gagal
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-bg-tertiary hover:text-text-primary transition-colors ml-1"
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {uploadingCount === 0 && (
            <button
              onClick={clearCompleted}
              className="p-1 rounded hover:bg-bg-tertiary hover:text-text-primary transition-colors"
              title="Tutup"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Upload Item List */}
      {!isCollapsed && (
        <div className="max-h-72 overflow-y-auto no-scrollbar p-2 flex flex-col gap-1.5">
          {uploadList.map((upload) => (
            <div
              key={upload.id}
              className={`p-2.5 rounded-xl border flex flex-col gap-2 relative group transition-all ${
                upload.status === 'failed'
                  ? 'bg-error/5 border-error/30'
                  : 'bg-bg-tertiary/40 border-border-subtle hover:border-border-medium'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate" title={upload.file.name}>
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatBytes(upload.file.size)}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                  {upload.status === 'uploading' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-accent-warm font-medium">{upload.progress}%</span>
                      <Loader2 size={16} className="text-accent-warm animate-spin" />
                    </div>
                  )}
                  {upload.status === 'pending' && (
                    <span className="text-xs text-text-muted">Menunggu...</span>
                  )}
                  {upload.status === 'success' && (
                    <CheckCircle2 size={16} className="text-success" />
                  )}
                  {upload.status === 'failed' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => retryFile(upload.id)}
                        className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                        title="Coba lagi"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <XCircle size={16} className="text-error" />
                    </div>
                  )}
                  {upload.status !== 'success' && (
                    <button
                      onClick={() => removeFile(upload.id)}
                      className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-error transition-colors"
                      title="Batalkan / Hapus"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Explicit error banner for failed upload */}
              {upload.status === 'failed' && upload.error && (
                <div className="px-2 py-1.5 rounded-lg bg-error/10 border border-error/20 text-xs text-error flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="break-words leading-tight flex-1">
                    {typeof upload.error === 'string' ? upload.error : JSON.stringify(upload.error)}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              {(upload.status === 'uploading' || upload.status === 'pending') && (
                <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-warm rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
