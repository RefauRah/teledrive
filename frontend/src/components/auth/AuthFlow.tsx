import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { Phone, Lock, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { useSendCode, useSignIn } from '../../hooks/useAuth';

type AuthStep = 'phone' | 'otp' | 'password';

export default function AuthFlow() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const sendCodeMutation = useSendCode();
  const signInMutation = useSignIn();

  useEffect(() => {
    if (step === 'phone' && phoneRef.current) {
      phoneRef.current.focus();
    }
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
    if (step === 'password' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  const handleSendCode = async () => {
    setError('');
    try {
      const result = await sendCodeMutation.mutateAsync(phone);
      setTransactionId(result.transactionId);
      setRequiresPassword(result.requiresPassword);
      setStep('otp');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
      setError(message.toLowerCase().includes('timeout') ? 'Request timed out. Please try again.' : message);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleSendCode();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 5).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 5) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 4);
      otpRefs.current[nextIndex]?.focus();

      if (newOtp.every((d) => d !== '')) {
        handleOtpComplete(newOtp);
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 4) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '')) {
      handleOtpComplete(newOtp);
    }
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
      const message = err instanceof Error ? err.message : 'Invalid code';
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
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message.toLowerCase().includes('timeout') ? 'Request timed out. Please try again.' : message);
    }
  };

  const isLoading = sendCodeMutation.isPending || signInMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary mb-5 shadow-lg shadow-accent-primary/25 text-white font-bold text-2xl">
          C
        </div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">CloudStorage</h1>
        <p className="text-text-secondary mt-2 text-sm">Unlimited cloud storage powered by Telegram</p>
      </div>

      {/* Card */}
      <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/40 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['phone', 'otp', 'password'] as AuthStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  step === s
                    ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30'
                    : i < ['phone', 'otp', 'password'].indexOf(step)
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-bg-tertiary text-text-muted border border-border-glass'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-all duration-300 ${
                    i < ['phone', 'otp', 'password'].indexOf(step)
                      ? 'bg-accent-primary'
                      : 'bg-border-glass bg-bg-tertiary'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Phone step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-primary/10 mb-3">
                <Phone className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Enter your phone</h2>
              <p className="text-text-secondary text-sm mt-1">
                We&apos;ll send a verification code via Telegram
              </p>
            </div>
            <div className="relative mb-6">
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20 transition-all text-center text-lg tracking-wider font-medium"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!phone.trim() || isLoading}
              className="w-full py-3.5 rounded-xl bg-accent-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin-slow" />
              ) : (
                <>
                  Continue
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-primary/10 mb-3">
                <ShieldCheck className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Verification code</h2>
              <p className="text-text-secondary text-sm mt-1">
                Enter the code sent to your Telegram app
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
                  className="w-12 h-14 rounded-xl bg-bg-tertiary border border-border-glass text-text-primary text-center text-xl font-bold focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20 transition-all"
                />
              ))}
            </div>
            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 text-accent-primary animate-spin-slow" />
              </div>
            )}
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                className="w-full py-2 text-accent-primary font-medium text-sm hover:text-accent-primary/80 transition-colors disabled:opacity-50"
              >
                {sendCodeMutation.isPending ? 'Sending...' : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '']);
                  setError('');
                }}
                className="w-full py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
              >
                Change phone number
              </button>
            </div>
          </div>
        )}

        {/* Password step */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-primary/10 mb-3">
                <Lock className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Two-factor authentication</h2>
              <p className="text-text-secondary text-sm mt-1">
                Enter your 2FA password
              </p>
            </div>
            <div className="relative mb-6">
              <input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20 transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="w-full py-3.5 rounded-xl bg-accent-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin-slow" />
              ) : (
                <>
                  Sign In
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
