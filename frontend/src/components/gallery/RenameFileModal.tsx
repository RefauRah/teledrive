import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2 } from 'lucide-react';
import type { VFile } from '../../domain/types';

interface RenameFileModalProps {
  isOpen: boolean;
  file: VFile | null;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  isLoading?: boolean;
}

export const RenameFileModal: React.FC<RenameFileModalProps> = ({
  isOpen,
  file,
  onClose,
  onRename,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && file) {
      setName(file.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      onRename(file.id, name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/60 animate-fade-in-scale">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-warm/15 border border-accent-warm/30 flex items-center justify-center text-accent-warm">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Ubah Nama File</h3>
              <p className="text-xs text-text-muted">Edit nama file media</p>
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Nama File
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama file"
              className="w-full px-4 py-3 bg-bg-secondary/80 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-1 focus:ring-accent-warm transition-all text-sm font-medium"
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
              disabled={!name.trim() || isLoading}
              className="px-5 py-2 bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary font-bold rounded-xl text-sm shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
