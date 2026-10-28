import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-warm/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-rose/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-accent-purple/8 blur-[120px] pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,235,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,235,0.012)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <main className="w-full max-w-md relative z-10 text-center animate-fade-in-up">
        {/* Glowing 404 badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-bg-tertiary border border-border-subtle mb-6 shadow-2xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-accent-warm/20 to-accent-rose/20 blur-md group-hover:blur-lg transition-all" />
          <FileQuestion className="w-10 h-10 text-accent-warm relative z-10 group-hover:scale-105 transition-transform" />
        </div>

        <h1 className="text-6xl sm:text-7xl font-black gradient-warm-text tracking-tight mb-3">
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-3">
          Halaman Tidak Ditemukan
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8 max-w-sm mx-auto">
          Halaman yang Anda tuju tidak tersedia, telah dipindahkan, atau alamat URL yang Anda masukkan salah.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-bg-tertiary border border-border-subtle hover:border-border-default text-text-secondary hover:text-text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Kembali</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-accent-warm to-accent-rose text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent-warm/20 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
          >
            <Home size={15} />
            <span>Ke Halaman Utama</span>
          </Link>
        </div>
      </main>
    </div>
  );
};
