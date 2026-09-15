import React, { useState } from 'react';
import { X, Folder, Home, Check } from 'lucide-react';
import type { VFolder, VFile } from '../../domain/types';

interface MoveFileModalProps {
  isOpen: boolean;
  file?: VFile | null;
  files?: VFile[];
  folders: VFolder[];
  onClose: () => void;
  onMove: (fileId: string, targetFolderId: string | null) => void;
  onMoveMultiple?: (fileIds: string[], targetFolderId: string | null) => void;
  isLoading?: boolean;
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  isOpen,
  file,
  files = [],
  folders,
  onClose,
  onMove,
  onMoveMultiple,
  isLoading = false,
}) => {
  const activeFiles = files.length > 0 ? files : file ? [file] : [];
  const initialFolderId = activeFiles[0]?.folderId || null;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);

  if (!isOpen || activeFiles.length === 0) return null;

  const handleSave = () => {
    if (activeFiles.length > 1 && onMoveMultiple) {
      onMoveMultiple(
        activeFiles.map((f) => f.id),
        selectedFolderId
      );
    } else if (activeFiles.length === 1) {
      onMove(activeFiles[0].id, selectedFolderId);
    }
    onClose();
  };

  const title =
    activeFiles.length > 1
      ? `Pindahkan ${activeFiles.length} Media`
      : 'Pindahkan Media';
  const subtitle =
    activeFiles.length > 1
      ? `${activeFiles.length} file dipilih`
      : activeFiles[0]?.name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/60 animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <h3 className="font-bold text-text-primary text-lg">{title}</h3>
            <p className="text-xs text-text-muted truncate max-w-[300px]">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Destination List */}
        <div className="py-4 max-h-[300px] overflow-y-auto space-y-1.5 custom-scrollbar">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
            Pilih Album Tujuan:
          </p>

          {/* Root Option */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
              selectedFolderId === null
                ? 'bg-accent-warm/15 border border-accent-warm/40 text-accent-warm'
                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home size={18} className={selectedFolderId === null ? 'text-accent-warm' : 'text-text-muted'} />
              <span className="font-medium text-sm">Semua Kenangan (Utama)</span>
            </div>
            {selectedFolderId === null && <Check size={16} className="text-accent-warm" />}
          </button>

          {/* Folders */}
          {folders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-accent-warm/15 border border-accent-warm/40 text-accent-warm'
                    : 'bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folder size={18} className={isSelected ? 'text-accent-warm' : 'text-accent-warm/70'} />
                  <span className="font-medium text-sm truncate max-w-[240px]">{f.name}</span>
                </div>
                {isSelected && <Check size={16} className="text-accent-warm" />}
              </button>
            );
          })}

          {folders.length === 0 && selectedFolderId !== null && (
            <p className="text-xs text-text-muted text-center py-2">
              Belum ada album lain dibuat.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2 bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary font-bold rounded-xl text-sm shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? 'Memindahkan...' : 'Pindahkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
