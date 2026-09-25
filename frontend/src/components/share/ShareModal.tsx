import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Calendar,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Folder,
  FileText,
} from 'lucide-react';
import type { Share, VFile, VFolder } from '../../domain/types';
import { createShareLink, getItemShare, revokeShare } from '../../services/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VFile | VFolder | null;
  type: 'file' | 'folder';
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [currentShare, setCurrentShare] = useState<Share | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form options
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiryDays, setExpiryDays] = useState<number | ''>('');
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');

  useEffect(() => {
    if (!isOpen || !item) return;

    setLoading(true);
    setError(null);
    setCopied(false);
    setPassword('');
    setEnablePassword(false);
    setExpiryDays('');
    setMaxDownloads('');

    getItemShare(type, item.id)
      .then((share) => {
        setCurrentShare(share);
      })
      .catch((err) => {
        console.error('Failed to get item share:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, item, type]);

  if (!isOpen || !item) return null;

  const getFullShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const handleCopy = () => {
    if (!currentShare) return;
    navigator.clipboard.writeText(getFullShareUrl(currentShare.shareToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateOrUpdate = async () => {
    setCreating(true);
    setError(null);

    try {
      const share = await createShareLink({
        fileId: type === 'file' ? item.id : null,
        folderId: type === 'folder' ? item.id : null,
        password: enablePassword && password.trim().length > 0 ? password.trim() : null,
        expiresInDays: typeof expiryDays === 'number' && expiryDays > 0 ? expiryDays : null,
        maxDownloads: typeof maxDownloads === 'number' && maxDownloads > 0 ? maxDownloads : null,
      });

      setCurrentShare(share);
      handleCopy();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Gagal membuat tautan share');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!currentShare) return;
    setRevoking(true);
    setError(null);

    try {
      await revokeShare(currentShare.id);
      setCurrentShare(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Gagal mematikan tautan');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl bg-bg-secondary border border-border-medium shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-bg-tertiary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-warm/15 text-accent-warm flex items-center justify-center border border-accent-warm/20">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                Bagikan {type === 'folder' ? 'Folder' : 'Berkas'}
              </h3>
              <p className="text-xs text-text-secondary truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                {type === 'folder' ? <Folder size={12} /> : <FileText size={12} />}
                <span className="truncate font-medium">{item.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-secondary">
              <Loader2 size={28} className="animate-spin text-accent-warm" />
              <p className="text-sm">Memeriksa status tautan...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error">
                  {error}
                </div>
              )}

              {/* Active Link Banner */}
              {currentShare && (
                <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border-medium flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                      <Globe size={14} />
                      Tautan Aktif (Siapa saja yang memiliki link dapat melihat & mengunduh)
                    </span>
                    <span className="text-xs text-text-muted">
                      {currentShare.downloadCount} kali diunduh
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-bg-primary border border-border-subtle text-xs text-text-secondary truncate font-mono select-all">
                      {getFullShareUrl(currentShare.shareToken)}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="px-3.5 py-2 rounded-xl bg-accent-warm text-text-inverse font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shrink-0"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Tersalin!' : 'Salin'}
                    </button>
                    <a
                      href={getFullShareUrl(currentShare.shareToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-bg-primary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors shrink-0"
                      title="Buka tautan"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[11px] text-text-muted">
                    <div className="flex items-center gap-3">
                      {currentShare.passwordHash && (
                        <span className="text-accent-gold flex items-center gap-1">
                          <Lock size={12} /> Terproteksi Password
                        </span>
                      )}
                      {currentShare.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Kedaluwarsa:{' '}
                          {new Date(currentShare.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {currentShare.maxDownloads && (
                        <span className="flex items-center gap-1">
                          <Download size={12} /> Maks: {currentShare.maxDownloads}x
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleRevoke}
                      disabled={revoking}
                      className="text-error hover:underline flex items-center gap-1 transition-colors"
                    >
                      {revoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Matikan Link
                    </button>
                  </div>
                </div>
              )}

              {/* Create / Customize Section */}
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  {currentShare ? 'Perbarui Opsi Tautan Baru' : 'Opsi Pengamanan & Batasan'}
                </p>

                {/* Password Protection */}
                <div className="p-3.5 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col gap-2.5">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2.5">
                      <Lock size={16} className="text-text-secondary" />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Proteksi Kata Sandi</p>
                        <p className="text-xs text-text-muted">
                          Pengunjung wajib memasukkan password sebelum membuka
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.checked)}
                      className="w-4 h-4 rounded border-border-strong text-accent-warm focus:ring-accent-warm/40"
                    />
                  </label>

                  {enablePassword && (
                    <input
                      type="password"
                      placeholder="Masukkan kata sandi rahasia..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-medium text-text-primary text-xs focus:outline-none focus:border-accent-warm transition-all"
                    />
                  )}
                </div>

                {/* Expiry & Download Limit Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Expiration */}
                  <div className="p-3.5 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Calendar size={14} className="text-text-secondary" />
                      Masa Berlaku
                    </label>
                    <select
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-2.5 py-2 rounded-xl bg-bg-primary border border-border-medium text-text-primary text-xs focus:outline-none focus:border-accent-warm"
                    >
                      <option value="">Selamanya (Tanpa batas)</option>
                      <option value={1}>1 Hari</option>
                      <option value={7}>7 Hari</option>
                      <option value={30}>30 Hari</option>
                    </select>
                  </div>

                  {/* Max Downloads */}
                  <div className="p-3.5 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Download size={14} className="text-text-secondary" />
                      Batas Unduhan
                    </label>
                    <select
                      value={maxDownloads}
                      onChange={(e) =>
                        setMaxDownloads(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full px-2.5 py-2 rounded-xl bg-bg-primary border border-border-medium text-text-primary text-xs focus:outline-none focus:border-accent-warm"
                    >
                      <option value="">Bebas (Tanpa batas)</option>
                      <option value={5}>5 kali unduh</option>
                      <option value={20}>20 kali unduh</option>
                      <option value={100}>100 kali unduh</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between bg-bg-tertiary/30">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck size={14} className="text-success" />
            <span>Tautan publik aman & cepat</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleCreateOrUpdate}
              disabled={creating || (enablePassword && !password.trim())}
              className="px-5 py-2 rounded-xl gradient-warm text-text-inverse font-bold text-xs flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-warm/20"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Share2 size={14} />
              )}
              {currentShare ? 'Buat Tautan Baru' : 'Buat Tautan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
