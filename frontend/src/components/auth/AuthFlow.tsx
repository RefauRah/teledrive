import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { Phone, Lock, ShieldCheck, Loader2, ArrowRight, ChevronDown, Check } from 'lucide-react';
import { useSendCode, useSignIn } from '../../hooks/useAuth';

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

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const countryPickerRef = useRef<HTMLDivElement>(null);

  const sendCodeMutation = useSendCode();
  const signInMutation = useSignIn();

  useEffect(() => {
    if (step === 'phone' && phoneRef.current) phoneRef.current.focus();
    if (step === 'otp' && otpRefs.current[0]) otpRefs.current[0].focus();
    if (step === 'password' && passwordRef.current) passwordRef.current.focus();
  }, [step]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneChange = (inputVal: string) => {
    // Clean all non-digit and non-plus characters
    let cleaned = inputVal.replace(/[^\d+]/g, '');

    // Handle pasted +62 or other country code
    for (const c of COUNTRIES) {
      if (cleaned.startsWith(c.code)) {
        setSelectedCountry(c);
        cleaned = cleaned.slice(c.code.length);
        break;
      }
    }

    // Handle pasted 62... (without +)
    if (cleaned.startsWith('62') && selectedCountry.code === '+62' && cleaned.length > 8) {
      cleaned = cleaned.slice(2);
    }

    // Handle leading 0 (e.g. user typed 08123456789)
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

  const isLoading = sendCodeMutation.isPending || signInMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-warm mb-5 shadow-lg shadow-accent-warm/25">
          <span className="text-white font-extrabold text-2xl">A</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Aetheria</h1>
        <p className="text-text-secondary mt-2 text-sm">Infinite Memory & Media Vault</p>
      </div>

      {/* Card */}
      <div className="glass-strong rounded-2xl p-8 shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['phone', 'otp', 'password'] as AuthStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  step === s
                    ? 'gradient-warm text-white shadow-lg shadow-accent-warm/30'
                    : i < ['phone', 'otp', 'password'].indexOf(step)
                      ? 'bg-accent-warm/20 text-accent-warm'
                      : 'bg-bg-tertiary text-text-muted border border-border-subtle'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-all duration-300 ${
                    i < ['phone', 'otp', 'password'].indexOf(step)
                      ? 'bg-accent-warm'
                      : 'bg-border-subtle'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Phone step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-warm/10 mb-3">
                <Phone className="w-5 h-5 text-accent-warm" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Masukkan Nomor HP</h2>
              <p className="text-text-secondary text-xs mt-1">
                Kode negara (<span className="text-accent-warm font-semibold">{selectedCountry.code}</span>) otomatis terpasang
              </p>
            </div>

            {/* Country code prefix & phone input group */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center rounded-xl bg-bg-tertiary border border-border-subtle focus-within:border-accent-warm/50 focus-within:ring-2 focus-within:ring-accent-warm/20 transition-all p-1">
                {/* Country selector button */}
                <div className="relative" ref={countryPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-bg-elevated/70 hover:bg-bg-elevated text-text-primary text-sm font-semibold transition-colors border border-border-subtle shrink-0"
                    title="Pilih kode negara"
                  >
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span className="font-mono text-xs text-text-primary font-bold">{selectedCountry.code}</span>
                    <ChevronDown size={14} className={`text-text-muted transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {showCountryPicker && (
                    <div className="absolute left-0 top-full mt-2 w-56 max-h-60 overflow-y-auto rounded-xl bg-bg-secondary border border-border-medium shadow-2xl z-50 p-1.5 flex flex-col gap-1 no-scrollbar animate-scale-up">
                      <div className="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
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
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                            selectedCountry.code === c.code
                              ? 'bg-accent-warm/15 text-accent-warm font-bold'
                              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="flex items-center gap-1 font-mono font-medium">
                            {c.code}
                            {selectedCountry.code === c.code && <Check size={12} />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Local Phone input */}
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  value={localPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="812 3456 7890"
                  className="flex-1 px-3 py-2.5 bg-transparent border-0 text-text-primary placeholder:text-text-muted focus:outline-none text-base tracking-wider font-semibold"
                  disabled={isLoading}
                />
              </div>

              <p className="text-[11px] text-text-muted text-center">
                Contoh: ketik <strong className="text-text-secondary">81234567890</strong> atau <strong className="text-text-secondary">081234567890</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={!localPhone.trim() || localPhone.trim().length < 5 || isLoading}
              className="w-full py-3.5 rounded-xl gradient-warm text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-warm/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-press"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin-slow" />
              ) : (
                <>
                  Lanjutkan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-warm/10 mb-3">
                <ShieldCheck className="w-5 h-5 text-accent-warm" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Kode Verifikasi</h2>
              <p className="text-text-secondary text-xs mt-1">
                Masukkan kode yang dikirim ke Telegram{' '}
                <strong className="text-text-primary font-mono font-bold">{fullSubmittedPhone}</strong>
              </p>
            </div>
            <div className="flex justify-center gap-3 mb-6">
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
                  className="w-12 h-14 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-center text-xl font-bold focus:outline-none focus:border-accent-warm/40 focus:ring-2 focus:ring-accent-warm/15 transition-all"
                />
              ))}
            </div>
            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 text-accent-warm animate-spin-slow" />
              </div>
            )}
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                className="w-full py-2 text-accent-warm font-medium text-sm hover:text-accent-warm/80 transition-colors disabled:opacity-50"
              >
                {sendCodeMutation.isPending ? 'Mengirim...' : 'Kirim ulang kode'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '']); setError(''); }}
                className="w-full py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
              >
                Ganti nomor HP
              </button>
            </div>
          </div>
        )}

        {/* Password step */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-warm/10 mb-3">
                <Lock className="w-5 h-5 text-accent-warm" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Autentikasi dua faktor</h2>
              <p className="text-text-secondary text-sm mt-1">
                Masukkan password 2FA Anda
              </p>
            </div>
            <div className="relative mb-6">
              <input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm/40 focus:ring-2 focus:ring-accent-warm/15 transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="w-full py-3.5 rounded-xl gradient-warm text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-warm/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-press"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin-slow" />
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
