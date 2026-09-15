import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Sparkles } from 'lucide-react';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isLoading?: boolean;
}

const PRESET_SUGGESTIONS = [
  '🏖️ Liburan',
  '🎂 Ulang Tahun',
  '👨‍👩‍👧‍👦 Keluarga',
  '🎓 Wisuda',
  '❤️ Favorit',
  '🚗 Traveling',
  '💼 Pekerjaan',
  '🎉 Perayaan',
];

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [albumName, setAlbumName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAlbumName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (albumName.trim() && !isLoading) {
      onCreate(albumName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/60 animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-warm/15 border border-accent-warm/30 flex items-center justify-center text-accent-warm">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Buat Album Baru</h3>
              <p className="text-xs text-text-muted">Kelompokkan kenangan indah Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Nama Album / Kategori
            </label>
            <input
              ref={inputRef}
              type="text"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="Contoh: Liburan Bali 2025"
              className="w-full px-4 py-3 bg-bg-secondary/80 border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-1 focus:ring-accent-warm transition-all text-sm font-medium"
              maxLength={60}
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
              <Sparkles size={13} className="text-accent-warm" />
              <span>Inspirasi Cepat:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SUGGESTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAlbumName(preset)}
                  className="px-2.5 py-1 rounded-lg bg-bg-secondary hover:bg-accent-warm/15 hover:text-accent-warm text-text-muted text-xs transition-colors border border-border-subtle/50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!albumName.trim() || isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary font-bold rounded-xl text-sm shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isLoading ? 'Membuat...' : 'Buat Album'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
