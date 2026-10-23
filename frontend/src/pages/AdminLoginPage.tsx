import React, { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Sparkles,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { loginWithPassword } from '../services/api';

export const AdminLoginPage: React.FC = () => {
  const { user, isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated and admin, redirect to /admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleFillDefaultAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Harap masukkan username dan kata sandi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await loginWithPassword(username.trim(), password);
      if (res.user.role !== 'admin') {
        setError('Akses ditolak: Akun ini tidak memiliki hak akses Administrator');
        return;
      }
      login(res.token, res.user);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Login administrator gagal';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-rose/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-warm/10 blur-[150px] pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,235,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,235,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <main className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Back to User Drive Link */}
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Halaman Masuk Pengguna</span>
          </Link>
        </div>

        {/* Brand & Badge Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-rose to-accent-warm mb-4 shadow-xl shadow-accent-rose/25 group">
            <Shield className="w-8 h-8 text-white group-hover:scale-105 transition-transform" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-[11px] font-bold mb-2">
            <Sparkles size={12} />
            <span>Administrator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Aetheria Admin
          </h1>
          <p className="text-text-secondary mt-1.5 text-xs font-medium">
            Masuk untuk mengelola pengguna, kuota, file, dan sistem
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-default/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2.5 font-medium animate-fade-in">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Fill Box */}
          <div className="mb-6 p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <KeyRound size={13} className="text-accent-warm" />
                <span>Akun Default Admin</span>
              </div>
              <button
                type="button"
                onClick={handleFillDefaultAdmin}
                className="px-2.5 py-1 rounded-lg bg-accent-warm/15 hover:bg-accent-warm/25 text-accent-warm text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                Gunakan Otomatis
              </button>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-text-secondary font-mono">
              <span>User: <strong className="text-text-primary">admin</strong></span>
              <span>Pass: <strong className="text-text-primary">admin123</strong></span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <UserIcon size={13} className="text-accent-warm" /> Username Admin
              </label>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/20 text-sm font-semibold transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <Lock size={13} className="text-accent-rose" /> Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-rose focus:ring-2 focus:ring-accent-rose/20 text-sm font-medium transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="mt-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent-rose to-accent-warm text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-rose/20 hover:opacity-95 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Admin Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-[11px] mt-6">
          Akses terbatas hanya untuk administrator sistem yang berwenang.
        </p>
      </main>
    </div>
  );
};
