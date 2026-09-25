import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  Lock,
  HardDrive,
  FileText,
  Folder,
  AlertCircle,
  Loader2,
  Music,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import type { PublicShareData } from '../domain/types';
import { getPublicShare, downloadPublicShare, getPublicShareBlobUrl } from '../services/api';

const formatBytes = (bytes: number = 0, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const PublicSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password state
  const [password, setPassword] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Downloading state
  const [downloadingId, setDownloadingId] = useState<number | 'main' | null>(null);

  // Preview state
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchShareData = async (pwd?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setPasswordError(null);

    try {
      const res = await getPublicShare(token, pwd);
      setData(res);

      // If authorized single file and media, load preview blob
      if (res.isAuthorized && res.item && res.type === 'file') {
        const mime = res.item.mimeType || '';
        if (
          mime.startsWith('image/') ||
          mime.startsWith('video/') ||
          mime.startsWith('audio/')
        ) {
          loadPreview(token, undefined, pwd);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.message === 'Kata sandi salah') {
        setPasswordError('Kata sandi yang Anda masukkan salah.');
      } else {
        setError(err.response?.data?.error || err.message || 'Tautan tidak valid atau telah kedaluwarsa.');
      }
    } finally {
      setLoading(false);
      setVerifyingPassword(false);
    }
  };

  const loadPreview = async (t: string, fileId?: number, pwd?: string) => {
    try {
      setLoadingPreview(true);
      const url = await getPublicShareBlobUrl(t, fileId, pwd);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.warn('Could not load preview stream:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchShareData();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setVerifyingPassword(true);
    fetchShareData(password.trim());
  };

  const handleDownload = async (fileId?: number) => {
    if (!token) return;
    const downloadKey = fileId ?? 'main';
    setDownloadingId(downloadKey);

    try {
      await downloadPublicShare(token, fileId, password || undefined);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Gagal mengunduh berkas');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderMediaPreview = () => {
    if (!data?.item || data.type !== 'file') return null;
    const mime = data.item.mimeType || '';

    if (loadingPreview) {
      return (
        <div className="w-full h-64 rounded-2xl bg-bg-primary/50 border border-border-subtle flex flex-col items-center justify-center gap-2 text-text-muted">
          <Loader2 size={24} className="animate-spin text-accent-warm" />
          <span className="text-xs">Memuat pratinjau...</span>
        </div>
      );
    }

    if (previewBlobUrl) {
      if (mime.startsWith('image/')) {
        return (
          <div className="w-full max-h-96 rounded-2xl overflow-hidden bg-bg-primary/50 border border-border-subtle flex items-center justify-center p-2">
            <img
              src={previewBlobUrl}
              alt={data.item.name}
              className="max-h-88 object-contain rounded-xl shadow-lg"
            />
          </div>
        );
      }
      if (mime.startsWith('video/')) {
        return (
          <div className="w-full rounded-2xl overflow-hidden bg-bg-primary border border-border-subtle shadow-xl">
            <video
              src={previewBlobUrl}
              controls
              className="w-full max-h-96 object-contain"
            />
          </div>
        );
      }
      if (mime.startsWith('audio/')) {
        return (
          <div className="w-full p-6 rounded-2xl bg-bg-primary/60 border border-border-subtle flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-warm/15 text-accent-warm flex items-center justify-center border border-accent-warm/20">
              <Music size={32} />
            </div>
            <audio src={previewBlobUrl} controls className="w-full" />
          </div>
        );
      }
    }

    // Default icon preview
    return (
      <div className="w-full py-10 rounded-2xl bg-bg-primary/30 border border-border-subtle flex flex-col items-center justify-center gap-3 text-text-muted">
        <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-secondary border border-border-medium">
          <FileText size={32} />
        </div>
        <p className="text-xs text-text-muted">Pratinjau langsung tidak tersedia untuk format ini</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between selection:bg-accent-warm selection:text-text-inverse">
      {/* Top Navigation */}
      <header className="px-6 py-4 border-b border-border-subtle bg-bg-secondary/40 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center shadow-lg shadow-accent-warm/20 group-hover:scale-105 transition-transform">
            <HardDrive size={18} className="text-text-inverse" />
          </div>
          <span className="font-bold text-lg tracking-tight text-text-primary">
            Tele<span className="text-accent-warm">Drive</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-tertiary/50 px-3 py-1.5 rounded-full border border-border-subtle">
          <Sparkles size={13} className="text-accent-gold" />
          <span>Didukung oleh Cloud Telegram</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl animate-fade-in-up">
          {loading ? (
            <div className="p-12 rounded-3xl bg-bg-secondary/60 border border-border-medium shadow-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-xl">
              <Loader2 size={32} className="animate-spin text-accent-warm" />
              <p className="text-sm text-text-secondary">Menyiapkan berkas bersama...</p>
            </div>
          ) : error ? (
            /* Error Card */
            <div className="p-8 rounded-3xl bg-bg-secondary/60 border border-border-medium shadow-2xl flex flex-col items-center text-center gap-4 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl bg-error/15 text-error flex items-center justify-center border border-error/20">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Tautan Tidak Tersedia</h2>
              <p className="text-sm text-text-secondary max-w-md">{error}</p>
              <Link
                to="/"
                className="mt-2 px-5 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated text-xs font-semibold text-text-primary border border-border-subtle transition-colors"
              >
                Kembali ke Beranda
              </Link>
            </div>
          ) : data?.isPasswordProtected && !data.isAuthorized ? (
            /* Password Lock Form */
            <div className="p-8 rounded-3xl bg-bg-secondary/70 border border-border-medium shadow-2xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-16 h-16 rounded-2xl bg-accent-gold/15 text-accent-gold flex items-center justify-center border border-accent-gold/20 mb-2 animate-bounce-subtle">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Tautan Dilindungi Kata Sandi</h2>
                <p className="text-xs text-text-secondary max-w-sm">
                  Pemilik berkas ini (<strong className="text-text-primary">{data.ownerName}</strong>) telah mengunci akses dengan kata sandi rahasia.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <KeyRound size={14} /> Masukkan Kata Sandi
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Ketik kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-medium text-sm text-text-primary focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingPassword || !password.trim()}
                  className="w-full py-3 rounded-xl gradient-warm text-text-inverse font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 shadow-lg shadow-accent-warm/20"
                >
                  {verifyingPassword ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Lock size={16} />
                  )}
                  Buka Akses Berkas
                </button>
              </form>
            </div>
          ) : data?.item ? (
            /* Authorized View (File or Folder) */
            <div className="rounded-3xl bg-bg-secondary/70 border border-border-medium shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
              {/* Header Info */}
              <div className="p-6 border-b border-border-subtle flex items-start justify-between gap-4 bg-bg-tertiary/20">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-accent-warm/15 text-accent-warm flex items-center justify-center border border-accent-warm/20 shrink-0">
                    {data.type === 'folder' ? <Folder size={24} /> : <FileText size={24} />}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold text-text-primary break-words leading-snug">
                      {data.item.name}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                      <span>Dibagikan oleh <strong className="text-text-secondary">{data.ownerName}</strong></span>
                      {data.item.size !== undefined && (
                        <span>• {formatBytes(data.item.size)}</span>
                      )}
                      <span>• {new Date(data.item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 flex flex-col gap-6">
                {data.type === 'file' ? (
                  <>
                    {/* Media Preview Box */}
                    {renderMediaPreview()}

                    {/* Caption if available */}
                    {data.item.caption && (
                      <div className="p-3.5 rounded-xl bg-bg-tertiary/40 border border-border-subtle text-xs text-text-secondary">
                        <p className="font-semibold text-text-primary mb-1">Catatan:</p>
                        <p className="whitespace-pre-wrap">{data.item.caption}</p>
                      </div>
                    )}

                    {/* Big Download Button */}
                    <button
                      onClick={() => handleDownload()}
                      disabled={downloadingId === 'main'}
                      className="w-full py-3.5 rounded-2xl gradient-warm text-text-inverse font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 hover:opacity-95 active:scale-98 transition-all disabled:opacity-75 shadow-xl shadow-accent-warm/25"
                    >
                      {downloadingId === 'main' ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Mengunduh Berkas...</span>
                        </>
                      ) : (
                        <>
                          <Download size={20} />
                          <span>Unduh Berkas ({formatBytes(data.item.size)})</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Folder File Explorer List */
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                      <span>Daftar Isi Folder ({data.item.files?.length || 0} berkas)</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto no-scrollbar">
                      {data.item.files && data.item.files.length > 0 ? (
                        data.item.files.map((file) => (
                          <div
                            key={file.id}
                            className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-subtle hover:border-border-medium flex items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText size={18} className="text-accent-warm shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">
                                  {file.name}
                                </p>
                                <p className="text-[11px] text-text-muted">
                                  {formatBytes(file.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDownload(file.id)}
                              disabled={downloadingId === file.id}
                              className="px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-accent-warm hover:text-text-inverse text-xs font-semibold text-text-secondary transition-all flex items-center gap-1.5 shrink-0"
                            >
                              {downloadingId === file.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                              Unduh
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-text-muted">
                          Folder ini kosong.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-text-muted border-t border-border-subtle">
        TeleDrive • Penyimpanan Awan Bebas Batas berbasis Telegram
      </footer>
    </div>
  );
};
