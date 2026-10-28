import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  LockOpen,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
  FileText,
  Unlock,
  Settings,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import type { VFile, VFolder } from '../../domain/types';
import {
  getVaultStatus,
  setupVaultPin,
  verifyVaultPin,
  changeVaultPin,
  getVaultItems,
  toggleVaultStatus,
  getStoredVaultToken,
  setStoredVaultToken,
  getFileDownloadUrl,
} from '../../services/api';

interface PrivateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewFile?: (file: VFile, files: VFile[], index: number) => void;
  onItemsChanged?: () => void;
}

type VaultStep =
  | 'CHECKING'
  | 'SETUP_NEW'
  | 'SETUP_CONFIRM'
  | 'ENTER_PIN'
  | 'CHANGE_OLD'
  | 'CHANGE_NEW'
  | 'UNLOCKED';

export const PrivateVaultModal: React.FC<PrivateVaultModalProps> = ({
  isOpen,
  onClose,
  onPreviewFile,
  onItemsChanged,
}) => {
  const [step, setStep] = useState<VaultStep>('CHECKING');
  const [pinDigits, setPinDigits] = useState<string>('');
  const [tempFirstPin, setTempFirstPin] = useState<string>('');
  const [tempOldPin, setTempOldPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showWrongPinPopup, setShowWrongPinPopup] = useState<boolean>(false);

  // Unlocked vault state
  const [vaultFiles, setVaultFiles] = useState<VFile[]>([]);
  const [vaultFolders, setVaultFolders] = useState<VFolder[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isUnlockingItems, setIsUnlockingItems] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Close and lock modal immediately
  const handleCloseModal = useCallback(() => {
    setStoredVaultToken(null);
    setVaultFiles([]);
    setVaultFolders([]);
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setPinDigits('');
    setErrorMessage('');
    setShowWrongPinPopup(false);
    setStep('CHECKING');
    onClose();
  }, [onClose]);

  // Initialize and check status when opened - ALWAYS requires PIN if set
  const loadInitialStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setPinDigits('');
    setShowWrongPinPopup(false);
    // Clear stored vault token on open so closing/reopening always requires entering PIN
    setStoredVaultToken(null);

    try {
      const status = await getVaultStatus();
      if (status.hasPin) {
        setStep('ENTER_PIN');
      } else {
        setStep('SETUP_NEW');
      }
    } catch (err: any) {
      console.error('Failed to check vault status:', err);
      setErrorMessage('Gagal memeriksa status Brankas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadInitialStatus();
    } else {
      setStoredVaultToken(null);
      setVaultFiles([]);
      setVaultFolders([]);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      setPinDigits('');
      setErrorMessage('');
      setShowWrongPinPopup(false);
      setStep('CHECKING');
    }
  }, [isOpen, loadInitialStatus]);

  // Load vault items
  const fetchVaultItems = async () => {
    try {
      setIsLoading(true);
      const items = await getVaultItems();
      setVaultFiles(items.files);
      setVaultFolders(items.folders);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
    } catch (err: any) {
      console.error('Failed to fetch vault items:', err);
      setErrorMessage('Gagal memuat berkas brankas.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger shake on error
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPinDigits('');
    }, 500);
  };

  // Submit current 4-digit PIN
  const handlePinComplete = async (completedPin: string) => {
    if (isLoading) return;

    if (step === 'SETUP_NEW') {
      setTempFirstPin(completedPin);
      setPinDigits('');
      setStep('SETUP_CONFIRM');
      return;
    }

    if (step === 'SETUP_CONFIRM') {
      if (completedPin !== tempFirstPin) {
        triggerError('PIN konfirmasi tidak cocok. Coba lagi.');
        setTempFirstPin('');
        setStep('SETUP_NEW');
        return;
      }

      try {
        setIsLoading(true);
        await setupVaultPin(completedPin);
        setNotification('PIN Brankas berhasil dibuat!');
        await fetchVaultItems();
        setStep('UNLOCKED');
      } catch (err: any) {
        triggerError(err.response?.data?.error || 'Gagal menyimpan PIN.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 'ENTER_PIN') {
      try {
        setIsLoading(true);
        await verifyVaultPin(completedPin);
        setNotification('Brankas berhasil dibuka!');
        await fetchVaultItems();
        setStep('UNLOCKED');
      } catch (err: any) {
        setIsLoading(false);
        triggerError('PIN salah. Akses ditolak.');
        setShowWrongPinPopup(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 'CHANGE_OLD') {
      try {
        setIsLoading(true);
        await verifyVaultPin(completedPin);
        setTempOldPin(completedPin);
        setPinDigits('');
        setStep('CHANGE_NEW');
      } catch (err: any) {
        setIsLoading(false);
        triggerError('PIN lama tidak sesuai.');
        setShowWrongPinPopup(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 'CHANGE_NEW') {
      try {
        setIsLoading(true);
        await changeVaultPin(tempOldPin, completedPin);
        setNotification('PIN Brankas berhasil diperbarui!');
        setTempOldPin('');
        setStep('UNLOCKED');
      } catch (err: any) {
        triggerError(err.response?.data?.error || 'Gagal memperbarui PIN.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  // Handle number click on keypad
  const handleDigitPress = (digit: string) => {
    if (isLoading || isShaking) return;
    if (pinDigits.length < 4) {
      const nextDigits = pinDigits + digit;
      setPinDigits(nextDigits);
      setErrorMessage('');
      if (nextDigits.length === 4) {
        handlePinComplete(nextDigits);
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading || isShaking) return;
    setPinDigits((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    if (isLoading || isShaking) return;
    setPinDigits('');
    setErrorMessage('');
  };

  // Keyboard support for numpad / digits
  useEffect(() => {
    if (!isOpen || step === 'UNLOCKED' || step === 'CHECKING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        if (showWrongPinPopup) {
          setShowWrongPinPopup(false);
          setPinDigits('');
        } else {
          handleCloseModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, pinDigits, isLoading, isShaking, showWrongPinPopup, handleCloseModal]);

  // Lock Vault immediately
  const handleLockSafe = () => {
    setStoredVaultToken(null);
    setVaultFiles([]);
    setVaultFolders([]);
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setPinDigits('');
    setStep('ENTER_PIN');
    setNotification('Brankas berhasil dikunci.');
    setTimeout(() => setNotification(null), 2500);
  };

  // Restore/Unlock selected items back to main gallery
  const handleUnlockSelected = async () => {
    const fileIds = Array.from(selectedFileIds);
    const folderIds = Array.from(selectedFolderIds);
    if (fileIds.length === 0 && folderIds.length === 0) return;

    try {
      setIsUnlockingItems(true);
      await toggleVaultStatus(fileIds, folderIds, false);
      setNotification(`${fileIds.length + folderIds.length} berkas berhasil dikembalikan ke galeri.`);
      await fetchVaultItems();
      onItemsChanged?.();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error('Failed to unlock items:', err);
      alert('Gagal mengembalikan berkas dari brankas.');
    } finally {
      setIsUnlockingItems(false);
    }
  };

  // Unlock single item
  const handleUnlockSingleFile = async (file: VFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleVaultStatus([file.id], [], false);
      setNotification(`"${file.name}" dikembalikan ke galeri.`);
      await fetchVaultItems();
      onItemsChanged?.();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error('Failed to unlock file:', err);
      alert('Gagal mengembalikan berkas.');
    }
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────
  // RENDER: UNLOCKED VAULT GALLERY VIEW
  // ─────────────────────────────────────────────────────────────
  if (step === 'UNLOCKED') {
    const totalSelected = selectedFileIds.size + selectedFolderIds.size;
    const allSelected =
      vaultFiles.length > 0 &&
      selectedFileIds.size === vaultFiles.length &&
      selectedFolderIds.size === vaultFolders.length;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in"
        onClick={handleCloseModal}
      >
        <div
          className="relative w-full max-w-5xl h-[88vh] bg-bg-primary/95 rounded-3xl shadow-2xl border border-amber-500/20 flex flex-col overflow-hidden animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/40 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <LockOpen size={22} className="text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-text-primary text-lg tracking-tight">
                    Brankas Rahasia
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    TERBUKA
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Berkas tersembunyi dari timeline galeri & dilindungi PIN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTempOldPin('');
                  setPinDigits('');
                  setStep('CHANGE_OLD');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle transition-all cursor-pointer"
                title="Ganti PIN Brankas"
              >
                <Settings size={14} className="text-text-muted" />
                <span className="hidden sm:inline">Ganti PIN</span>
              </button>

              <button
                onClick={handleLockSafe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Kunci Brankas Sekarang"
              >
                <Lock size={14} />
                <span>Kunci Brankas</span>
              </button>

              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {notification && (
            <div className="px-6 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                <span>{notification}</span>
              </div>
              <button onClick={() => setNotification(null)} className="cursor-pointer text-amber-400">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Subheader / Selection actions */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle/50 bg-bg-secondary/20 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-text-secondary">
                Total: <strong className="text-text-primary">{vaultFiles.length} berkas</strong>
                {vaultFolders.length > 0 && ` & ${vaultFolders.length} album`}
              </span>

              {vaultFiles.length > 0 && (
                <button
                  onClick={() => {
                    if (allSelected) {
                      setSelectedFileIds(new Set());
                      setSelectedFolderIds(new Set());
                    } else {
                      setSelectedFileIds(new Set(vaultFiles.map((f) => f.id)));
                      setSelectedFolderIds(new Set(vaultFolders.map((f) => f.id)));
                    }
                  }}
                  className="text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  {allSelected ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            {totalSelected > 0 && (
              <button
                onClick={handleUnlockSelected}
                disabled={isUnlockingItems}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-bg-primary font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {isUnlockingItems ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Unlock size={13} />
                )}
                <span>Keluarkan ({totalSelected}) dari Brankas</span>
              </button>
            )}
          </div>

          {/* Body: Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
                <Loader2 size={28} className="animate-spin text-amber-400" />
                <p className="text-xs">Mendekripsi berkas brankas...</p>
              </div>
            ) : vaultFiles.length === 0 && vaultFolders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                  <Shield size={32} />
                </div>
                <h4 className="font-bold text-text-primary text-base mb-1">
                  Brankas Masih Kosong
                </h4>
                <p className="text-xs text-text-muted leading-relaxed mb-6">
                  Foto, video, atau dokumen yang Anda kunci akan tersimpan di sini dan tidak akan
                  terlihat di galeri utama.
                </p>
                <div className="p-3.5 rounded-2xl bg-bg-secondary/70 border border-border-subtle text-left text-xs text-text-secondary space-y-2">
                  <p className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Cara Mengunci Berkas:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-text-muted text-[11px]">
                    <li>Klik kanan foto/video di galeri utama</li>
                    <li>Pilih opsi <strong className="text-amber-400">"Kunci ke Brankas"</strong></li>
                    <li>Berkas langsung lenyap dari feed umum & masuk ke sini!</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {vaultFiles.map((file, idx) => {
                  const isSelected = selectedFileIds.has(file.id);
                  const isImage =
                    file.mimeType?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                  const isVideo =
                    file.mimeType?.startsWith('video/') ||
                    /\.(mp4|webm|mov|mkv)$/i.test(file.name);

                  // Authenticated streaming URL with vault token
                  const vaultToken = getStoredVaultToken();
                  const downloadUrl = getFileDownloadUrl(file.id, vaultToken || undefined);

                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        setSelectedFileIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(file.id)) next.delete(file.id);
                          else next.add(file.id);
                          return next;
                        });
                      }}
                      onDoubleClick={() => onPreviewFile?.(file, vaultFiles, idx)}
                      className={`group relative rounded-2xl overflow-hidden border bg-bg-secondary/80 aspect-square flex flex-col cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 scale-[0.98]'
                          : 'border-border-subtle hover:border-amber-400/50 hover:shadow-lg'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-full h-full bg-black/40 flex items-center justify-center overflow-hidden relative">
                        {isImage ? (
                          <img
                            src={downloadUrl}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : isVideo ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-bg-tertiary">
                            <Video size={28} className="text-accent-rose" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          </div>
                        ) : (
                          <FileText size={28} className="text-text-muted" />
                        )}

                        {/* Lock watermark badge */}
                        <div className="absolute top-2 left-2 p-1 rounded-lg bg-black/60 backdrop-blur-md text-amber-400">
                          <Lock size={12} />
                        </div>

                        {/* Select checkbox */}
                        <div
                          className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-bg-primary'
                              : 'bg-black/50 text-white/50 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <CheckSquare size={13} />
                        </div>

                        {/* Quick restore button on hover */}
                        <button
                          onClick={(e) => handleUnlockSingleFile(file, e)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-amber-500 text-text-secondary hover:text-bg-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
                          title="Keluarkan dari brankas ke galeri"
                        >
                          <Unlock size={14} />
                        </button>
                      </div>

                      {/* File Info footer */}
                      <div className="p-2 bg-bg-secondary/90 border-t border-border-subtle/50 text-left">
                        <p className="text-xs font-semibold text-text-primary truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">
                          {file.caption || 'Berkas Rahasia'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: KEYPAD / PIN SCREEN (SETUP, UNLOCK, CHANGE PIN)
  // ─────────────────────────────────────────────────────────────
  const keypadRows = [
    [
      { num: '1', letters: '' },
      { num: '2', letters: 'ABC' },
      { num: '3', letters: 'DEF' },
    ],
    [
      { num: '4', letters: 'GHI' },
      { num: '5', letters: 'JKL' },
      { num: '6', letters: 'MNO' },
    ],
    [
      { num: '7', letters: 'PQRS' },
      { num: '8', letters: 'TUV' },
      { num: '9', letters: 'WXYZ' },
    ],
    [
      { num: 'clear', letters: '' },
      { num: '0', letters: '+' },
      { num: 'backspace', letters: '' },
    ],
  ];

  let title = 'Masukkan PIN Brankas';
  let subtitle = 'Masukkan 4 digit PIN untuk membuka berkas rahasia';
  let icon = <Lock size={26} className="text-amber-400" />;

  if (step === 'SETUP_NEW') {
    title = 'Atur PIN Brankas Baru';
    subtitle = 'Buat 4 digit PIN untuk melindungi berkas rahasia Anda';
    icon = <KeyRound size={26} className="text-amber-400" />;
  } else if (step === 'SETUP_CONFIRM') {
    title = 'Konfirmasi PIN Anda';
    subtitle = 'Masukkan ulang 4 digit PIN untuk verifikasi';
    icon = <ShieldCheck size={26} className="text-amber-400" />;
  } else if (step === 'CHANGE_OLD') {
    title = 'Verifikasi PIN Saat Ini';
    subtitle = 'Masukkan PIN lama Anda sebelum membuat yang baru';
    icon = <KeyRound size={26} className="text-amber-400" />;
  } else if (step === 'CHANGE_NEW') {
    title = 'Masukkan PIN Baru';
    subtitle = 'Masukkan 4 digit PIN baru yang ingin digunakan';
    icon = <ShieldCheck size={26} className="text-amber-400" />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in select-none"
      onClick={handleCloseModal}
    >
      <div
        className="relative w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl border border-amber-500/30 flex flex-col items-center animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top close/back */}
        <div className="w-full flex items-center justify-between mb-2">
          {step === 'SETUP_CONFIRM' || step === 'CHANGE_OLD' || step === 'CHANGE_NEW' ? (
            <button
              onClick={() => {
                setPinDigits('');
                setErrorMessage('');
                if (step === 'SETUP_CONFIRM') setStep('SETUP_NEW');
                else if (step === 'CHANGE_OLD') setStep('UNLOCKED');
                else if (step === 'CHANGE_NEW') setStep('CHANGE_OLD');
              }}
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="w-6" />
          )}

          <button
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shield Icon with glowing ring */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-amber-400/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
          {icon}
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-extrabold text-text-primary text-xl tracking-tight text-center mb-1">
          {title}
        </h3>
        <p className="text-xs text-text-muted text-center max-w-xs mb-6 leading-relaxed">
          {subtitle}
        </p>

        {/* 4 PIN Dots */}
        <div
          className={`flex items-center justify-center gap-4 mb-6 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pinDigits.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-110'
                    : 'bg-bg-tertiary border-2 border-border-default'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage ? (
          <div className="text-rose-400 text-xs font-semibold mb-4 text-center animate-fade-in flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="h-5 mb-3" />
        )}

        {/* 3x4 Safe Keypad */}
        <div className="w-full max-w-[260px] grid grid-cols-3 gap-3">
          {keypadRows.map((row, rIdx) =>
            row.map((item, cIdx) => {
              if (item.num === 'clear') {
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={handleClear}
                    className="h-14 rounded-2xl flex items-center justify-center text-xs font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                );
              }
              if (item.num === 'backspace') {
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={handleBackspace}
                    className="h-14 rounded-2xl flex items-center justify-center text-text-muted hover:text-text-primary active:scale-95 transition-all cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>
                );
              }

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleDigitPress(item.num)}
                  className="h-14 rounded-2xl bg-bg-secondary/70 hover:bg-bg-tertiary active:bg-amber-500/20 border border-border-subtle/80 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 active:scale-95 shadow-sm"
                >
                  <span className="text-xl font-bold text-text-primary leading-none">
                    {item.num}
                  </span>
                  {item.letters && (
                    <span className="text-[9px] font-semibold text-text-muted tracking-widest mt-0.5">
                      {item.letters}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-[10px] text-text-muted text-center flex items-center justify-center gap-1">
          <Shield size={11} className="text-amber-400" />
          <span>Enkripsi PIN dengan Scrypt & Zero-Knowledge Verification</span>
        </p>
      </div>

      {/* Wrong PIN Popup Dialog */}
      {showWrongPinPopup && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setShowWrongPinPopup(false);
            setPinDigits('');
          }}
        >
          <div
            className="relative w-full max-w-xs bg-bg-secondary border border-rose-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-3.5 text-rose-400 shadow-lg shadow-rose-500/20">
              <ShieldAlert size={28} />
            </div>
            <h4 className="text-base font-extrabold text-text-primary mb-1.5">
              PIN Brankas Salah!
            </h4>
            <p className="text-xs text-text-muted mb-5 leading-relaxed">
              PIN yang Anda masukkan tidak sesuai. Silakan coba masukkan PIN yang benar.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowWrongPinPopup(false);
                setPinDigits('');
                setErrorMessage('');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-rose-500/25"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
