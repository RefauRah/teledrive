import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isDanger = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/80 animate-fade-in-scale"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          {/* Icon Badge */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
              isDanger
                ? 'bg-red-500/15 border border-red-500/30 text-red-400 shadow-red-500/10'
                : 'bg-accent-warm/15 border border-accent-warm/30 text-accent-warm shadow-accent-warm/10'
            }`}
          >
            {isDanger ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
          </div>

          <h3 className="text-xl font-bold text-text-primary mb-2 tracking-tight">
            {title}
          </h3>

          <p className="text-sm text-text-secondary leading-relaxed px-2">
            {message}
          </p>

          {isDanger && (
            <div className="mt-4 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span>Pesan & media di Telegram juga akan dihapus permanen.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle/60 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              isDanger
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-90 active:scale-95 shadow-red-500/20'
                : 'bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary hover:opacity-90 active:scale-95 shadow-accent-warm/20'
            }`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            <span>{isLoading ? 'Memproses...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
