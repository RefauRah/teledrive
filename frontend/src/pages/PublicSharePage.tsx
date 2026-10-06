import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  Lock,
  FileText,
  Folder,
  AlertCircle,
  Loader2,
  Music,
  Sparkles,
  KeyRound,
  Copy,
  Check,
  Archive,
  Film,
  Image as ImageIcon,
  User as UserIcon,
  Calendar,
  Layers,
  CheckCircle2,
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

const getFileCategory = (name: string, mimeType?: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = mimeType || '';

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'xz'].includes(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) {
    return {
      type: 'archive',
      label: `Berkas Arsip (.${ext.toUpperCase()})`,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
      icon: Archive,
    };
  }

  if (mime.startsWith('video/') || ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv'].includes(ext)) {
    return {
      type: 'video',
      label: `Berkas Video (.${ext.toUpperCase()})`,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
      borderColor: 'border-purple-500/30',
      icon: Film,
    };
  }

  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) {
    return {
      type: 'audio',
      label: `Berkas Audio (.${ext.toUpperCase()})`,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      icon: Music,
    };
  }

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return {
      type: 'image',
      label: `Berkas Gambar (.${ext.toUpperCase()})`,
      color: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/30',
      icon: ImageIcon,
    };
  }

  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext) || mime.includes('pdf') || mime.includes('document')) {
    return {
      type: 'document',
      label: `Dokumen (.${ext.toUpperCase()})`,
      color: 'from-rose-500 to-pink-600',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/15',
      borderColor: 'border-rose-500/30',
      icon: FileText,
    };
  }

  return {
    type: 'file',
    label: `Berkas .${ext.toUpperCase() || 'BIN'}`,
    color: 'from-accent-warm to-accent-rose',
    textColor: 'text-accent-warm',
    bgColor: 'bg-accent-warm/15',
    borderColor: 'border-accent-warm/30',
    icon: FileText,
  };
};

export const PublicSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileCategory = data?.item ? getFileCategory(data.item.name, data.item.mimeType) : null;
  const CategoryIcon = fileCategory ? fileCategory.icon : FileText;

  const renderMediaPreview = () => {
    if (!data?.item || data.type !== 'file') return null;
    const mime = data.item.mimeType || '';

    if (loadingPreview) {
      return (
        <div className="w-full h-56 rounded-2xl bg-bg-tertiary/40 border border-border-subtle flex flex-col items-center justify-center gap-2 text-text-muted">
          <Loader2 size={24} className="animate-spin text-accent-warm" />
          <span className="text-xs">Memuat pratinjau media...</span>
        </div>
      );
    }

    if (previewBlobUrl) {
      if (mime.startsWith('image/')) {
        return (
          <div className="w-full max-h-96 rounded-2xl overflow-hidden bg-bg-tertiary/40 border border-border-subtle flex items-center justify-center p-3">
            <img
              src={previewBlobUrl}
              alt={data.item.name}
              className="max-h-80 object-contain rounded-xl shadow-xl"
            />
          </div>
        );
      }
      if (mime.startsWith('video/')) {
        return (
          <div className="w-full rounded-2xl overflow-hidden bg-bg-tertiary border border-border-subtle shadow-2xl">
            <video
              src={previewBlobUrl}
              controls
              className="w-full max-h-96 object-contain bg-black"
            />
          </div>
        );
      }
      if (mime.startsWith('audio/')) {
        return (
          <div className="w-full p-6 rounded-2xl bg-bg-tertiary/50 border border-border-subtle flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25 shadow-lg shadow-emerald-500/10">
              <Music size={32} />
            </div>
            <audio src={previewBlobUrl} controls className="w-full max-w-md" />
          </div>
        );
      }
    }

    // Default rich icon presentation for archives, binaries, etc.
    return (
      <div className="w-full py-10 px-6 rounded-2xl bg-bg-tertiary/30 border border-border-subtle flex flex-col items-center justify-center gap-3 text-center relative overflow-hidden">
        <div className={`w-20 h-20 rounded-3xl ${fileCategory?.bgColor || 'bg-accent-warm/15'} ${fileCategory?.textColor || 'text-accent-warm'} flex items-center justify-center border ${fileCategory?.borderColor || 'border-accent-warm/25'} shadow-xl mb-1`}>
          <CategoryIcon size={40} />
        </div>
        <p className="text-sm font-semibold text-text-primary">{fileCategory?.label}</p>
        <p className="text-xs text-text-muted max-w-sm">
          Berkas siap diunduh secara langsung dengan kecepatan tinggi melalui Aetheria Cloud.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between selection:bg-accent-warm selection:text-text-inverse relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-accent-warm/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-[500px] h-[350px] bg-accent-rose/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full glass-strong relative border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer group shrink-0">
            <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-accent-warm/20 group-hover:shadow-accent-warm/30 transition-shadow">
              A
            </div>
            <h1 className="text-lg font-extrabold gradient-warm-text tracking-wide">
              Aetheria
            </h1>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary bg-bg-tertiary/60 px-3.5 py-1.5 rounded-full border border-border-subtle shadow-sm">
            <Sparkles size={14} className="text-accent-warm" />
            <span>Vault Berkas Bersama</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)] relative z-10 w-full">
        <div className="w-full max-w-2xl animate-fade-in-up">
          {loading ? (
            <div className="p-12 rounded-3xl glass-strong border border-border-medium shadow-2xl flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-warm/15 text-accent-warm flex items-center justify-center border border-accent-warm/25">
                <Loader2 size={28} className="animate-spin text-accent-warm" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Menyiapkan Berkas...</h3>
                <p className="text-xs text-text-secondary mt-1">Mengambil data dari Aetheria Cloud Vault</p>
              </div>
            </div>
          ) : error ? (
            /* Error Card */
            <div className="p-8 sm:p-10 rounded-3xl glass-strong border border-border-medium shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-error/15 text-error flex items-center justify-center border border-error/25 shadow-lg shadow-error/10">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Tautan Tidak Tersedia</h2>
              <p className="text-sm text-text-secondary max-w-md">{error}</p>
              <Link
                to="/"
                className="mt-2 px-6 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-elevated text-xs font-bold text-text-primary border border-border-subtle transition-all btn-press"
              >
                Kembali ke Beranda
              </Link>
            </div>
          ) : data?.isPasswordProtected && !data.isAuthorized ? (
            /* Password Lock Form */
            <div className="p-8 sm:p-10 rounded-3xl glass-strong border border-border-medium shadow-2xl flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-16 h-16 rounded-2xl bg-accent-gold/15 text-accent-gold flex items-center justify-center border border-accent-gold/25 mb-1 shadow-lg shadow-accent-gold/10">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Tautan Dilindungi Kata Sandi</h2>
                <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                  Pemilik berkas (<strong className="text-text-primary font-semibold">{data.ownerName}</strong>) telah mengamankan akses dengan kata sandi rahasia.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                    <KeyRound size={14} className="text-accent-gold" /> Masukkan Kata Sandi
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Ketik kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border-medium text-sm text-text-primary focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 transition-all font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingPassword || !password.trim()}
                  className="w-full py-3.5 rounded-xl gradient-warm text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 shadow-xl shadow-accent-warm/25 btn-press"
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
            <div className="rounded-3xl glass-strong border border-border-medium shadow-2xl overflow-hidden flex flex-col">
              {/* Header Info */}
              <div className="p-6 sm:p-7 border-b border-border-subtle flex items-start justify-between gap-4 bg-bg-secondary/40">
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl ${fileCategory?.bgColor || 'bg-accent-warm/15'} ${fileCategory?.textColor || 'text-accent-warm'} flex items-center justify-center border ${fileCategory?.borderColor || 'border-accent-warm/25'} shrink-0 shadow-lg`}>
                    {data.type === 'folder' ? <Folder size={28} /> : <CategoryIcon size={28} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-text-primary break-words leading-snug">
                      {data.item.name}
                    </h1>

                    {/* Metadata Chips */}
                    <div className="flex items-center gap-2.5 text-xs text-text-secondary mt-2 flex-wrap font-medium">
                      <span className="flex items-center gap-1.5 bg-bg-tertiary/70 px-2.5 py-1 rounded-lg border border-border-subtle">
                        <UserIcon size={12} className="text-accent-warm" />
                        <span>Oleh <strong className="text-text-primary font-semibold">{data.ownerName}</strong></span>
                      </span>

                      {data.item.size !== undefined && (
                        <span className="flex items-center gap-1.5 bg-bg-tertiary/70 px-2.5 py-1 rounded-lg border border-border-subtle">
                          <Layers size={12} className="text-accent-rose" />
                          <strong className="text-text-primary">{formatBytes(data.item.size)}</strong>
                        </span>
                      )}

                      <span className="flex items-center gap-1.5 bg-bg-tertiary/70 px-2.5 py-1 rounded-lg border border-border-subtle">
                        <Calendar size={12} className="text-text-muted" />
                        <span>{new Date(data.item.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-7 flex flex-col gap-6">
                {data.type === 'file' ? (
                  <>
                    {/* Media Preview / Visual Presentation Box */}
                    {renderMediaPreview()}

                    {/* Caption / Note if available */}
                    {data.item.caption && (
                      <div className="p-4 rounded-2xl bg-bg-tertiary/50 border border-border-subtle text-xs text-text-secondary flex flex-col gap-1">
                        <p className="font-bold text-text-primary flex items-center gap-1.5">
                          <FileText size={13} className="text-accent-warm" />
                          Catatan Berkas:
                        </p>
                        <p className="whitespace-pre-wrap leading-relaxed text-text-primary/90">{data.item.caption}</p>
                      </div>
                    )}

                    {/* Big Action CTA Buttons */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleDownload()}
                        disabled={downloadingId === 'main'}
                        className="w-full py-4 rounded-2xl gradient-warm text-white font-extrabold text-base flex items-center justify-center gap-2.5 hover:opacity-95 active:scale-98 transition-all disabled:opacity-75 shadow-xl shadow-accent-warm/25 btn-press cursor-pointer"
                      >
                        {downloadingId === 'main' ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Memulai Pengunduhan...</span>
                          </>
                        ) : (
                          <>
                            <Download size={20} />
                            <span>Unduh Berkas Sekarang ({formatBytes(data.item.size)})</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Action: Copy Link */}
                      <div className="flex items-center justify-between pt-1 text-xs text-text-muted">
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle2 size={13} />
                          <span>Penyimpanan Aman Aetheria Cloud</span>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border-subtle transition-colors cursor-pointer"
                        >
                          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                          <span>{copied ? 'Tautan Tersalin!' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Folder File Explorer List */
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                      <span>Daftar Isi Folder ({data.item.files?.length || 0} berkas)</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto no-scrollbar">
                      {data.item.files && data.item.files.length > 0 ? (
                        data.item.files.map((file) => {
                          const cat = getFileCategory(file.name, file.mimeType);
                          const Icon = cat.icon;
                          return (
                            <div
                              key={file.id}
                              className="p-3.5 rounded-2xl bg-bg-tertiary/40 border border-border-subtle hover:border-border-medium flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-xl ${cat.bgColor} ${cat.textColor} flex items-center justify-center border ${cat.borderColor} shrink-0`}>
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-text-primary truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[11px] text-text-muted mt-0.5">
                                    {formatBytes(file.size)}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDownload(file.id)}
                                disabled={downloadingId === file.id}
                                className="px-3.5 py-2 rounded-xl bg-bg-elevated hover:bg-accent-warm hover:text-white text-xs font-bold text-text-primary transition-all flex items-center gap-1.5 shrink-0 btn-press cursor-pointer"
                              >
                                {downloadingId === file.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                                Unduh
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-10 text-center text-xs text-text-muted">
                          Folder ini belum memiliki berkas.
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
    </div>
  );
};

