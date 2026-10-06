import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import {
  Phone,
  Lock,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ChevronDown,
  QrCode,
  User as UserIcon,
  RefreshCw,
  Info,
  KeyRound,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSendCode, useSignIn } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/useAuthStore';
import { exportQrCode, checkQrStatus, submitQrPassword } from '../../services/api';

type AuthMethod = 'phone' | 'qr' | 'username';
type AuthStep = 'phone' | 'otp' | 'password';

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: CountryInfo[] = [
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', name: 'Singapura', flag: '🇸🇬' },
  { code: '+1', name: 'Amerika Serikat', flag: '🇺🇸' },
  { code: '+44', name: 'Inggris Raya', flag: '🇬🇧' },
  { code: '+81', name: 'Jepang', flag: '🇯🇵' },
  { code: '+82', name: 'Korea Selatan', flag: '🇰🇷' },
  { code: '+966', name: 'Arab Saudi', flag: '🇸🇦' },
  { code: '+971', name: 'Uni Emirat Arab', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
];

export default function AuthFlow() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [step, setStep] = useState<AuthStep>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [localPhone, setLocalPhone] = useState('');
  const [fullSubmittedPhone, setFullSubmittedPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState('');

  // QR Code Login State
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrTxId, setQrTxId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);
  const [qrStep, setQrStep] = useState<'scan' | 'password'>('scan');
  const [qrPassword, setQrPassword] = useState('');
  const [qrPasswordLoading, setQrPasswordLoading] = useState(false);

  // Username Login State
  const [usernameInput, setUsernameInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const countryPickerRef = useRef<HTMLDivElement>(null);
  const qrPollRef = useRef<NodeJS.Timeout | null>(null);

  const { login } = useAuthStore();
  const sendCodeMutation = useSendCode();
  const signInMutation = useSignIn();

  // Focus management
  useEffect(() => {
    if (authMethod === 'phone') {
      if (step === 'phone' && phoneRef.current) phoneRef.current.focus();
      if (step === 'otp' && otpRefs.current[0]) otpRefs.current[0].focus();
      if (step === 'password' && passwordRef.current) passwordRef.current.focus();
    }
  }, [step, authMethod]);

  // Handle outside click for country picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // QR Polling Lifecycle
  const stopQrPolling = () => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  };

  const startQrCodeFlow = async () => {
    stopQrPolling();
    setQrLoading(true);
    setQrExpired(false);
    setQrStep('scan');
    setError('');

    try {
      const qrRes = await exportQrCode();
      setQrTxId(qrRes.transaction_id);

      const dataUrl = await QRCode.toDataURL(qrRes.qr_url, {
        margin: 2,
        width: 280,
        color: {
          dark: '#0a0a0f',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
      setQrLoading(false);

      // Start polling
      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await checkQrStatus(qrRes.transaction_id);
          if (statusRes.status === 'success' && statusRes.token && statusRes.user) {
            stopQrPolling();
            login(statusRes.token, statusRes.user);
          } else if (statusRes.status === 'password_required') {
            stopQrPolling();
            setQrStep('password');
          } else if (statusRes.status === 'expired') {
            stopQrPolling();
            setQrExpired(true);
          } else if (statusRes.status === 'pending' && statusRes.qr_url) {
            const updatedDataUrl = await QRCode.toDataURL(statusRes.qr_url, {
              margin: 2,
              width: 280,
              color: { dark: '#0a0a0f', light: '#ffffff' },
            });
            setQrDataUrl(updatedDataUrl);
          }
        } catch {
          // Keep polling or let timeout handle
        }
      }, 2500);
    } catch (err: any) {
      setQrLoading(false);
      setError(err.message || 'Gagal memuat kode QR');
    }
  };

  useEffect(() => {
    if (authMethod === 'qr') {
      startQrCodeFlow();
    } else {
      stopQrPolling();
    }
    return () => stopQrPolling();
  }, [authMethod]);

  const handleQrPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!qrTxId || !qrPassword.trim()) return;

    setQrPasswordLoading(true);
    setError('');

    try {
      const res = await submitQrPassword(qrTxId, qrPassword.trim());
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Kata sandi 2FA tidak valid');
    } finally {
      setQrPasswordLoading(false);
    }
  };

  const handlePhoneChange = (inputVal: string) => {
    let cleaned = inputVal.replace(/[^\d+]/g, '');
    for (const c of COUNTRIES) {
      if (cleaned.startsWith(c.code)) {
        setSelectedCountry(c);
        cleaned = cleaned.slice(c.code.length);
        break;
      }
    }
    if (cleaned.startsWith('62') && selectedCountry.code === '+62' && cleaned.length > 8) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
    }
    setLocalPhone(cleaned);
  };

  const getFullPhoneNumber = () => {
    const cleanLocal = localPhone.replace(/^0+/, '').replace(/\D/g, '');
    return `${selectedCountry.code}${cleanLocal}`;
  };

  const handleSendCode = async () => {
    const fullPhone = getFullPhoneNumber();
    if (!localPhone.trim() || localPhone.trim().length < 5) {
      setError('Masukkan nomor HP yang valid');
      return;
    }

    setError('');
    try {
      setFullSubmittedPhone(fullPhone);
      const result = await sendCodeMutation.mutateAsync(fullPhone);
      setTransactionId(result.transactionId);
      setRequiresPassword(result.requiresPassword);
      setStep('otp');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim kode';
      setError(message.toLowerCase().includes('timeout') ? 'Waktu permintaan habis. Silakan coba lagi.' : message);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleSendCode();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 5).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 5) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 4);
      otpRefs.current[nextIndex]?.focus();
      if (newOtp.every((d) => d !== '')) handleOtpComplete(newOtp);
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 4) otpRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== '')) handleOtpComplete(newOtp);
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpComplete = async (otpDigits: string[]) => {
    const code = otpDigits.join('');
    if (requiresPassword) {
      setStep('password');
      return;
    }

    setError('');
    try {
      await signInMutation.mutateAsync({ transactionId, code });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kode tidak valid';
      if (message.includes('SESSION_PASSWORD_NEEDED') || message.includes('2FA') || message.includes('password')) {
        setRequiresPassword(true);
        setStep('password');
        setError('');
      } else {
        setError(message);
        setOtp(['', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    try {
      await signInMutation.mutateAsync({ transactionId, code, password });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kredensial tidak valid';
      setError(message.toLowerCase().includes('timeout') ? 'Waktu permintaan habis. Silakan coba lagi.' : message);
    }
  };

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const input = usernameInput.trim();
    if (!input) {
      setError('Masukkan username atau nomor akun Anda');
      return;
    }

    // If user provided a phone number directly in username field
    const isDigitsOnly = /^[\d+\s-]+$/.test(input);
    if (isDigitsOnly) {
      const cleaned = input.replace(/[^\d+]/g, '');
      setLocalPhone(cleaned.replace(/^\+?62/, '').replace(/^0+/, ''));
      setAuthMethod('phone');
      return;
    }

    // Switch to fast QR scan login with clear helpful prompt
    setAuthMethod('qr');
  };

  const isLoading = sendCodeMutation.isPending || signInMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Logo Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-warm mb-4 shadow-lg shadow-accent-warm/25 group">
          <span className="text-white font-extrabold text-2xl group-hover:scale-105 transition-transform">A</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Aetheria</h1>
        <p className="text-text-secondary mt-1.5 text-xs font-medium">Infinite Memory & Media Vault</p>
      </div>

      {/* Main Card */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-default/80 animate-fade-in-up">
        {/* Auth Method Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-bg-tertiary/70 rounded-2xl mb-6 border border-border-subtle">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMethod === 'phone'
                ? 'bg-gradient-to-r from-accent-warm to-accent-rose text-white shadow-md shadow-accent-warm/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <Phone size={14} />
            <span>Nomor HP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod('qr');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMethod === 'qr'
                ? 'bg-gradient-to-r from-accent-warm to-accent-rose text-white shadow-md shadow-accent-warm/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <QrCode size={14} />
            <span>Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod('username');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMethod === 'username'
                ? 'bg-gradient-to-r from-accent-warm to-accent-rose text-white shadow-md shadow-accent-warm/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <UserIcon size={14} />
            <span>Akun</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs text-center font-medium animate-fade-in">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PHONE AUTHENTICATION                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {authMethod === 'phone' && (
          <>
            {/* Step indicators for phone flow */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['phone', 'otp', 'password'] as AuthStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'gradient-warm text-white shadow-md shadow-accent-warm/30 scale-105'
                        : i < ['phone', 'otp', 'password'].indexOf(step)
                          ? 'bg-accent-warm/20 text-accent-warm'
                          : 'bg-bg-tertiary text-text-muted border border-border-subtle'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`w-6 h-0.5 rounded-full transition-all ${
                        i < ['phone', 'otp', 'password'].indexOf(step)
                          ? 'bg-accent-warm'
                          : 'bg-border-subtle'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Input Phone */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="animate-fade-in-up">
                <div className="text-center mb-5">
                  <h2 className="text-base font-bold text-text-primary">Masukkan Nomor HP</h2>
                  <p className="text-text-secondary text-xs mt-1">
                    Kode negara (<strong className="text-accent-warm">{selectedCountry.code}</strong>) terpasang otomatis
                  </p>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center rounded-2xl bg-bg-tertiary border border-border-subtle focus-within:border-accent-warm/50 focus-within:ring-2 focus-within:ring-accent-warm/20 transition-all p-1">
                    {/* Country selector */}
                    <div className="relative" ref={countryPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated/80 hover:bg-bg-elevated text-text-primary text-xs font-bold transition-colors border border-border-subtle shrink-0 cursor-pointer"
                      >
                        <span>{selectedCountry.flag}</span>
                        <span className="font-mono">{selectedCountry.code}</span>
                        <ChevronDown size={13} className={`text-text-muted transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                      </button>

                      {showCountryPicker && (
                        <div className="absolute left-0 top-full mt-2 w-56 max-h-60 overflow-y-auto rounded-2xl bg-bg-secondary border border-border-medium shadow-2xl z-50 p-1.5 flex flex-col gap-1 no-scrollbar animate-scale-up">
                          <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Pilih Negara
                          </div>
                          {COUNTRIES.map((c) => (
                            <button
                              key={c.code + c.name}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setShowCountryPicker(false);
                                phoneRef.current?.focus();
                              }}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                selectedCountry.code === c.code
                                  ? 'bg-accent-warm/15 text-accent-warm font-bold'
                                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span>{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </span>
                              <span className="font-mono font-medium">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      ref={phoneRef}
                      type="tel"
                      inputMode="numeric"
                      value={localPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="812 3456 7890"
                      className="flex-1 px-3 py-2.5 bg-transparent border-0 text-text-primary placeholder:text-text-muted focus:outline-none text-sm font-semibold tracking-wider"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-[11px] text-text-muted text-center">
                    Contoh: ketik <strong className="text-text-secondary font-mono">81234567890</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!localPhone.trim() || localPhone.trim().length < 5 || isLoading}
                  className="w-full py-3.5 rounded-2xl gradient-warm text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-warm/20 hover:opacity-95 active:scale-98 disabled:opacity-50 transition-all btn-press cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Kirim Kode Verifikasi</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Input OTP */}
            {step === 'otp' && (
              <div className="animate-fade-in-up">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-warm/10 mb-2">
                    <ShieldCheck className="w-5 h-5 text-accent-warm" />
                  </div>
                  <h2 className="text-base font-bold text-text-primary">Kode Verifikasi</h2>
                  <p className="text-text-secondary text-xs mt-1">
                    Kode dikirim ke <strong className="text-text-primary font-mono">{fullSubmittedPhone}</strong>
                  </p>
                </div>

                <div className="flex justify-center gap-2.5 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-11 h-13 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary text-center text-lg font-bold focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 transition-all"
                    />
                  ))}
                </div>

                {isLoading && (
                  <div className="flex justify-center mb-3">
                    <Loader2 className="w-5 h-5 text-accent-warm animate-spin" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className="w-full py-2 text-accent-warm font-bold text-xs hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {sendCodeMutation.isPending ? 'Mengirim...' : 'Kirim Ulang Kode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '', '']);
                      setError('');
                    }}
                    className="w-full py-2 text-text-muted text-xs hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Ganti Nomor HP
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Input 2FA Password */}
            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="animate-fade-in-up">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-warm/10 mb-2">
                    <Lock className="w-5 h-5 text-accent-warm" />
                  </div>
                  <h2 className="text-base font-bold text-text-primary">Kata Sandi 2FA</h2>
                  <p className="text-text-secondary text-xs mt-1">
                    Akun ini dilindungi kata sandi keamanan tambahan
                  </p>
                </div>

                <div className="relative mb-5">
                  <input
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ketik kata sandi 2FA..."
                    className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 text-sm font-medium transition-all"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!password.trim() || isLoading}
                  className="w-full py-3.5 rounded-2xl gradient-warm text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-warm/20 hover:opacity-95 active:scale-98 disabled:opacity-50 transition-all btn-press cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Buka & Masuk</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: QR CODE LOGIN                                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {authMethod === 'qr' && (
          <div className="flex flex-col items-center text-center animate-fade-in-up">
            {qrStep === 'scan' ? (
              <>
                <div className="mb-4">
                  <h2 className="text-base font-bold text-text-primary flex items-center justify-center gap-2">
                    <QrCode size={18} className="text-accent-warm" />
                    <span>Masuk Lewat Scan QR</span>
                  </h2>
                  <p className="text-text-secondary text-xs mt-1">
                    Scan instan langsung dari aplikasi di ponsel Anda
                  </p>
                </div>

                {/* QR Display Card */}
                <div className="relative w-64 h-64 rounded-3xl bg-white p-3.5 shadow-2xl flex items-center justify-center overflow-hidden border-2 border-accent-warm/30 my-2 group">
                  {qrLoading ? (
                    <div className="flex flex-col items-center gap-2 text-bg-primary">
                      <Loader2 size={32} className="animate-spin text-accent-warm" />
                      <span className="text-xs font-bold text-bg-primary">Menyiapkan QR...</span>
                    </div>
                  ) : qrExpired ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-4 text-center bg-bg-primary/95 inset-0 absolute rounded-3xl z-20">
                      <p className="text-xs text-text-muted font-medium">QR Code telah kedaluwarsa demi keamanan.</p>
                      <button
                        type="button"
                        onClick={startQrCodeFlow}
                        className="px-4 py-2 rounded-xl gradient-warm text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-accent-warm/25 active:scale-95 transition-transform cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        <span>Muat Ulang QR</span>
                      </button>
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Aetheria QR Login"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  ) : null}

                  {/* Laser Scanning Bar Animation */}
                  {!qrLoading && !qrExpired && (
                    <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-accent-warm to-transparent shadow-[0_0_12px_rgba(235,160,54,1)] animate-bounce pointer-events-none" />
                  )}
                </div>

                {/* Step Instructions */}
                <div className="w-full p-4 mt-4 rounded-2xl bg-bg-tertiary/50 border border-border-subtle text-left space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 text-text-secondary">
                    <span className="w-4 h-4 rounded-full bg-accent-warm/20 text-accent-warm font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Buka aplikasi di HP Anda</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-text-secondary">
                    <span className="w-4 h-4 rounded-full bg-accent-warm/20 text-accent-warm font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Buka <strong>Pengaturan &gt; Perangkat &gt; Hubungkan Perangkat</strong></span>
                  </div>
                  <div className="flex items-start gap-2.5 text-text-secondary">
                    <span className="w-4 h-4 rounded-full bg-accent-warm/20 text-accent-warm font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Arahkan kamera ke kode QR di atas</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startQrCodeFlow}
                  className="mt-3 flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Segarkan Kode QR</span>
                </button>
              </>
            ) : (
              /* QR Password Step if 2FA is required */
              <form onSubmit={handleQrPasswordSubmit} className="w-full animate-fade-in-up">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-warm/10 mb-2">
                    <KeyRound className="w-5 h-5 text-accent-warm" />
                  </div>
                  <h2 className="text-base font-bold text-text-primary">QR Berhasil Di-scan!</h2>
                  <p className="text-text-secondary text-xs mt-1">
                    Masukkan kata sandi 2FA akun Anda untuk menyelesaikan login
                  </p>
                </div>

                <div className="mb-5">
                  <input
                    type="password"
                    autoFocus
                    value={qrPassword}
                    onChange={(e) => setQrPassword(e.target.value)}
                    placeholder="Ketik kata sandi 2FA..."
                    className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 text-sm font-medium transition-all"
                    disabled={qrPasswordLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!qrPassword.trim() || qrPasswordLoading}
                  className="w-full py-3.5 rounded-2xl gradient-warm text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-warm/20 hover:opacity-95 active:scale-98 disabled:opacity-50 transition-all btn-press cursor-pointer"
                >
                  {qrPasswordLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Konfirmasi & Masuk</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: USERNAME & PASSWORD AUTHENTICATION                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {authMethod === 'username' && (
          <form onSubmit={handleUsernameSubmit} className="animate-fade-in-up flex flex-col gap-4">
            <div className="text-center mb-2">
              <h2 className="text-base font-bold text-text-primary">Masuk dengan Akun</h2>
              <p className="text-text-secondary text-xs mt-1">
                Gunakan username atau nomor akun Anda
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <UserIcon size={13} className="text-accent-warm" /> Username / Akun
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="@username atau nomor HP"
                className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 text-sm font-semibold transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <Lock size={13} className="text-accent-rose" /> Kata Sandi (2FA)
              </label>
              <input
                type="password"
                value={userPasswordInput}
                onChange={(e) => setUserPasswordInput(e.target.value)}
                placeholder="Kata sandi keamanan akun"
                className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 text-sm font-medium transition-all"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-bg-tertiary/40 border border-border-subtle text-[11px] text-text-muted flex items-start gap-2 leading-relaxed">
              <Info size={15} className="text-accent-warm shrink-0 mt-0.5" />
              <span>
                Untuk keamanan tingkat tinggi, autentikasi cloud diverifikasi melalui kode OTP langsung atau scan QR instan.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl gradient-warm text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-warm/20 hover:opacity-95 active:scale-98 transition-all btn-press cursor-pointer"
            >
              <span>Lanjutkan Masuk</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
