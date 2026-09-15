import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Sparkles } from 'lucide-react';
import type { VFile } from '../../domain/types';

interface EditCaptionModalProps {
  isOpen: boolean;
  file: VFile | null;
  onClose: () => void;
  onSave: (id: string, caption: string) => void;
  isLoading?: boolean;
}

export const EditCaptionModal: React.FC<EditCaptionModalProps> = ({
  isOpen,
  file,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [caption, setCaption] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && file) {
      setCaption(file.caption || '');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSave(file.id, caption.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/60 animate-fade-in-scale">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/15 border border-accent-purple/30 flex items-center justify-center text-accent-purple">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">
                {file.caption ? 'Edit Caption' : 'Tambah Caption'}
              </h3>
              <p className="text-xs text-text-muted truncate max-w-[280px]">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent-warm" />
              <span>Cerita & Catatan Kenangan</span>
            </label>
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tulis cerita atau deskripsi kenangan ini..."
              rows={4}
              className="w-full px-4 py-3 bg-bg-secondary/80 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-1 focus:ring-accent-warm transition-all text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary font-bold rounded-xl text-sm shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Caption'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
