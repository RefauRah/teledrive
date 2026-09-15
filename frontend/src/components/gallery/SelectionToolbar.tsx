import React from 'react';
import {
  CheckSquare,
  X,
  Download,
  FolderInput,
  Trash2,
} from 'lucide-react';
import type { VFile, VFolder } from '../../domain/types';

interface SelectionToolbarProps {
  selectedFiles: VFile[];
  selectedFolders: VFolder[];
  totalVisibleItems: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBatchDownload: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedFiles,
  selectedFolders,
  totalVisibleItems,
  onClearSelection,
  onSelectAll,
  onBatchDownload,
  onBatchMove,
  onBatchDelete,
}) => {
  const totalSelected = selectedFiles.length + selectedFolders.length;

  if (totalSelected === 0) return null;

  const isAllSelected = totalSelected === totalVisibleItems && totalVisibleItems > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-scale select-none max-w-[92vw]">
      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-bg-secondary/95 backdrop-blur-xl border border-accent-warm/40 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(235,160,54,0.15)] text-text-primary">
        {/* Count Badge */}
        <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-border-subtle">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-warm to-accent-rose flex items-center justify-center text-bg-primary font-extrabold text-xs shadow-sm">
            {totalSelected}
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-bold text-text-primary block leading-tight">
              {totalSelected} Dipilih
            </span>
            <span className="text-[10px] text-text-muted">
              {selectedFiles.length > 0 && `${selectedFiles.length} file `}
              {selectedFolders.length > 0 && `${selectedFolders.length} album`}
            </span>
          </div>
        </div>

        {/* Select All / Deselect button */}
        <button
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          title={isAllSelected ? 'Batalkan pilihan' : 'Pilih semua file & album'}
        >
          <CheckSquare size={15} className={isAllSelected ? 'text-accent-warm' : ''} />
          <span className="hidden md:inline">
            {isAllSelected ? 'Batal Semua' : 'Pilih Semua'}
          </span>
        </button>

        {/* Action: Download (only for files) */}
        {selectedFiles.length > 0 && (
          <button
            onClick={onBatchDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
            title={`Download ${selectedFiles.length} file terpilih`}
          >
            <Download size={15} className="text-accent-warm" />
            <span className="hidden md:inline">Download ({selectedFiles.length})</span>
          </button>
        )}

        {/* Action: Move (only for files) */}
        {selectedFiles.length > 0 && (
          <button
            onClick={onBatchMove}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
            title={`Pindahkan ${selectedFiles.length} file terpilih`}
          >
            <FolderInput size={15} className="text-accent-rose" />
            <span className="hidden md:inline">Pindahkan</span>
          </button>
        )}

        {/* Action: Delete */}
        <button
          onClick={onBatchDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-red-500/15 text-xs font-semibold text-red-400 hover:text-red-300 transition-all cursor-pointer"
          title={`Hapus ${totalSelected} item terpilih`}
        >
          <Trash2 size={15} className="text-red-400" />
          <span className="hidden md:inline">Hapus ({totalSelected})</span>
        </button>

        {/* Close / Dismiss */}
        <button
          onClick={onClearSelection}
          className="w-7 h-7 ml-1 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          title="Tutup seleksi"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
