import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  HardDrive,
  FolderHeart,
  Image,
  Layers,
  Database,
  RefreshCw,
  Upload,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { User, VFile, VFolder } from '../../domain/types';
import { useSyncWithTelegram } from '../../hooks/useFiles';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  files: VFile[];
  folders: VFolder[];
  onUploadClick: () => void;
  onCreateAlbumClick: () => void;
  onRefresh?: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  user,
  files,
  folders,
  onUploadClick,
  onCreateAlbumClick,
  onRefresh,
}) => {
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const syncMutation = useSyncWithTelegram();

  if (!isOpen) return null;

  const handleSync = async () => {
    try {
      setSyncStatus({ type: null, message: '' });
      const result = await syncMutation.mutateAsync();
      if (result.added > 0) {
        setSyncStatus({
          type: 'success',
          message: `Berhasil disinkronkan! ${result.added} file baru diimpor dari Pesan Tersimpan Telegram.`,
        });
      } else {
        setSyncStatus({
          type: 'success',
          message: 'Semua media sudah sinkron dengan Pesan Tersimpan Telegram.',
        });
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyinkronkan data dengan Telegram.',
      });
    }
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const photoCount = files.filter(
    (f) => f.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
  ).length;
  const videoCount = files.filter(
    (f) => f.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(f.name)
  ).length;
  const otherCount = files.length - photoCount - videoCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-strong rounded-3xl p-6 shadow-2xl border border-border-default/80 animate-fade-in-scale">
        {/* Header with warm glowing badge */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-warm via-accent-rose to-accent-purple p-0.5 shadow-lg shadow-accent-warm/25">
              <div className="w-full h-full bg-bg-primary rounded-[14px] flex items-center justify-center">
                <Sparkles size={22} className="text-accent-warm animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-text-primary text-xl tracking-wide">
                  Aetheria Vault
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-warm/15 text-accent-warm border border-accent-warm/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-text-muted">Brankas Penyimpanan Awan Tak Terbatas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sync Status Banner */}
        {syncStatus.type && (
          <div
            className={`mt-4 p-3 rounded-2xl flex items-center gap-2.5 text-xs animate-fade-in ${
              syncStatus.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}
          >
            {syncStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-red-400" />
            )}
            <span className="font-medium">{syncStatus.message}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-4 rounded-2xl bg-bg-secondary/70 border border-border-subtle/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-warm/15 flex items-center justify-center text-accent-warm shrink-0">
              <HardDrive size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Total Ukuran
              </p>
              <p className="text-base font-bold text-text-primary truncate">
                {formatBytes(totalBytes)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-secondary/70 border border-border-subtle/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-rose/15 flex items-center justify-center text-accent-rose shrink-0">
              <Image size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Total Media
              </p>
              <p className="text-base font-bold text-text-primary truncate">
                {files.length} Kenangan
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-secondary/70 border border-border-subtle/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center text-accent-purple shrink-0">
              <FolderHeart size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Total Album
              </p>
              <p className="text-base font-bold text-text-primary truncate">
                {folders.length} Koleksi
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bg-secondary/70 border border-border-subtle/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Kapasitas Cloud
              </p>
              <p className="text-base font-bold text-emerald-400 truncate">
                Unlimited ∞
              </p>
            </div>
          </div>
        </div>

        {/* Media Breakdown */}
        <div className="p-4 rounded-2xl bg-bg-secondary/50 border border-border-subtle/60 mb-4 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Rincian Media:
          </p>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-warm" />
              Foto: <strong className="text-text-primary">{photoCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-rose" />
              Video: <strong className="text-text-primary">{videoCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-purple" />
              Lainnya: <strong className="text-text-primary">{otherCount}</strong>
            </span>
          </div>
        </div>

        {/* Infrastructure & Security info */}
        <div className="space-y-2 mb-5 text-xs text-text-muted bg-bg-tertiary/40 p-3.5 rounded-2xl border border-border-subtle/40">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database size={14} className="text-accent-warm" />
              Database Engine
            </span>
            <span className="font-semibold text-text-primary">Turso / SQLite libSQL</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers size={14} className="text-accent-rose" />
              Cloud Storage Backend
            </span>
            <span className="font-semibold text-text-primary">Telegram MTProto Cloud</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              Enkripsi Sesi
            </span>
            <span className="font-semibold text-emerald-400">AES-256-GCM</span>
          </div>
          {user && (
            <div className="flex items-center justify-between pt-1 border-t border-border-subtle/30">
              <span>Akun Terhubung:</span>
              <span className="font-semibold text-text-primary">
                {user.firstName} ({user.phone})
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold border border-border-subtle transition-all cursor-pointer ${
              syncMutation.isPending ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            }`}
            title="Pindai media baru dari Saved Messages Telegram"
          >
            {syncMutation.isPending ? (
              <Loader2 size={14} className="animate-spin text-accent-warm" />
            ) : (
              <RefreshCw size={14} className="text-accent-warm" />
            )}
            <span>{syncMutation.isPending ? 'Menyinkronkan...' : 'Sinkronisasi Data'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onCreateAlbumClick();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold border border-border-subtle transition-colors cursor-pointer"
            >
              <FolderPlus size={14} className="text-accent-warm" />
              <span>+ Album</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onUploadClick();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-accent-warm to-accent-rose text-bg-primary font-bold rounded-xl text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Media</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
