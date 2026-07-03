import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Loader2, CheckCircle2, XCircle, RefreshCw, Upload } from 'lucide-react';
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

  // Auto-expand when a new upload starts
  useEffect(() => {
    const hasUploading = uploadList.some(u => u.status === 'uploading' || u.status === 'pending');
    if (hasUploading && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [uploads, isCollapsed]);

  // Auto-clear completed uploads after 4 seconds
  useEffect(() => {
    const successCount = uploadList.filter(u => u.status === 'success').length;
    const uploadingCount = uploadList.filter(u => u.status === 'uploading' || u.status === 'pending').length;
    
    let timeout: ReturnType<typeof setTimeout>;
    if (uploadingCount === 0 && successCount > 0) {
      timeout = setTimeout(() => {
        clearCompleted();
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [uploads, clearCompleted]);

  // Upload queue worker loop
  useEffect(() => {
    // 1. Check if there's already an active upload running
    const activeUpload = uploadList.find(u => u.status === 'uploading');
    if (activeUpload) return;

    // 2. Find the first pending item in the queue
    const pendingItem = uploadList.find(u => u.status === 'pending');
    if (!pendingItem) return;

    // 3. Process the pending upload
    const runUpload = async () => {
      // Mark as uploading in Zustand store
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

        // Mark as success
        updateStatus(pendingItem.id, 'success');

        // Invalidate directory cache to display the newly uploaded file in the UI
        queryClient.invalidateQueries({ queryKey: ['directory', pendingItem.folderId] });
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          // Ignore cancellation errors
          return;
        }
        console.error('File upload failed:', err);
        updateStatus(pendingItem.id, 'failed', err.response?.data?.error || err.message || 'Upload failed');
      }
    };

    runUpload();
  }, [uploads, queryClient]);

  if (uploadList.length === 0) return null;

  const uploadingCount = uploadList.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const successCount = uploadList.filter(u => u.status === 'success').length;
  const failedCount = uploadList.filter(u => u.status === 'failed').length;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 rounded-xl border border-border-glass bg-bg-secondary/90 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="bg-bg-tertiary/80 px-4 py-3 border-b border-border-glass flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          <Upload size={16} className="text-accent-primary" />
          <span className="font-bold text-sm">
            {uploadingCount > 0
              ? `Uploading ${uploadingCount} file${uploadingCount > 1 ? 's' : ''}...`
              : 'Uploads Completed'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary">
          {successCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-success/15 text-success font-semibold">
              {successCount} Success
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-error/15 text-error font-semibold">
              {failedCount} Failed
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-bg-secondary hover:text-text-primary transition-colors ml-1"
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {uploadingCount === 0 && (
            <button
              onClick={clearCompleted}
              className="p-1 rounded hover:bg-bg-secondary hover:text-text-primary transition-colors"
              title="Clear Completed"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Upload Item List */}
      {!isCollapsed && (
        <div className="max-h-72 overflow-y-auto no-scrollbar p-2 flex flex-col gap-1.5 bg-bg-secondary/50">
          {uploadList.map((upload) => (
            <div
              key={upload.id}
              className="p-2.5 rounded-lg bg-bg-tertiary/40 border border-border-glass/40 flex flex-col gap-2 relative group hover:border-text-muted/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate" title={upload.file.name}>
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatBytes(upload.file.size)}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                  {upload.status === 'uploading' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-accent-primary font-medium">{upload.progress}%</span>
                      <Loader2 size={16} className="text-accent-primary animate-spin" />
                    </div>
                  )}
                  {upload.status === 'pending' && (
                    <span className="text-xs text-text-secondary">Waiting...</span>
                  )}
                  {upload.status === 'success' && (
                    <CheckCircle2 size={16} className="text-success" />
                  )}
                  {upload.status === 'failed' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => retryFile(upload.id)}
                        className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                        title="Retry Upload"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <span title={upload.error}>
                        <XCircle size={16} className="text-error" />
                      </span>
                    </div>
                  )}
                  {upload.status !== 'success' && (
                    <button
                      onClick={() => removeFile(upload.id)}
                      className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-error transition-colors"
                      title="Cancel Upload"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {(upload.status === 'uploading' || upload.status === 'pending') && (
                <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-300 ease-out"
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
