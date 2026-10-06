import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  HardDrive,
  Zap,
  FolderHeart,
  Share2,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Layers,
  Database,
  QrCode,
  Film,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/drive');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-accent-warm selection:text-text-inverse relative overflow-x-hidden">
      {/* Ambient Background Glow Elements */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-accent-warm/12 via-accent-rose/8 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] right-[-150px] w-[600px] h-[600px] bg-accent-purple/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[1600px] left-[-150px] w-[600px] h-[600px] bg-accent-warm/8 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,240,235,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,235,0.012)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* ─── Top Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full glass-strong border-b border-border-subtle/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-accent-warm/25 group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight gradient-warm-text leading-tight">
                Aetheria
              </span>
              <span className="text-[10px] text-text-muted font-semibold tracking-wider uppercase">
                Cloud Memory Vault
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary">
            <a href="#fitur" className="hover:text-accent-warm transition-colors">
              Fitur Utama
            </a>
            <a href="#keamanan" className="hover:text-accent-warm transition-colors">
              Keamanan
            </a>
            <a href="#arsitektur" className="hover:text-accent-warm transition-colors">
              Arsitektur
            </a>
            <a href="#faq" className="hover:text-accent-warm transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/drive')}
                className="px-5 py-2.5 rounded-xl gradient-warm text-white text-xs sm:text-sm font-bold shadow-lg shadow-accent-warm/25 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer btn-press"
              >
                <span>Buka Vault Saya</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary text-text-primary text-xs sm:text-sm font-bold border border-border-subtle transition-all cursor-pointer"
                >
                  Masuk
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 rounded-xl gradient-warm text-white text-xs sm:text-sm font-bold shadow-lg shadow-accent-warm/25 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer btn-press"
                >
                  <span>Mulai Gratis</span>
                  <ArrowRight size={15} className="hidden sm:inline" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-warm/10 border border-accent-warm/30 text-accent-warm text-xs font-bold mb-6 animate-fade-in shadow-sm">
          <Sparkles size={14} className="animate-pulse text-accent-warm" />
          <span>Brankas Penyimpanan Awan Generasi Terbaru</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] animate-fade-in-up">
          Simpan Semua Kenangan & Berkas Anda dengan Aman.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-text-secondary max-w-2xl font-normal leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Aetheria adalah ruang penyimpanan awan aman dengan kuota gratis 10 GB untuk menyimpan ribuan foto resolusi tinggi, video 4K, musik, dan dokumen penting.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-warm text-white font-extrabold text-base shadow-2xl shadow-accent-warm/35 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer btn-press"
          >
            <span>{isAuthenticated ? 'Buka Galeri Vault' : 'Mulai Sekarang — Gratis 10 GB'}</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-accent-warm/40 text-text-primary font-bold text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
          >
            <QrCode size={18} className="text-accent-warm" />
            <span>Scan QR Login</span>
          </button>
        </div>

        {/* Key Metrics Strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="p-4 rounded-2xl glass-strong border border-border-subtle flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">10 GB</span>
            <span className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Kuota Penyimpanan</span>
          </div>

          <div className="p-4 rounded-2xl glass-strong border border-border-subtle flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black gradient-warm-text">2 GB</span>
            <span className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Maksimal per File</span>
          </div>

          <div className="p-4 rounded-2xl glass-strong border border-border-subtle flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black text-accent-rose">AES-256</span>
            <span className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Enkripsi Sesi</span>
          </div>

          <div className="p-4 rounded-2xl glass-strong border border-border-subtle flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black text-accent-purple">0 Rp</span>
            <span className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Bebas Langganan</span>
          </div>
        </div>

        {/* ─── Hero UI Preview Mockup Card ─────────────────────────── */}
        <div className="mt-16 w-full max-w-5xl rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-[#2a2a38]/60 to-transparent border border-border-default/80 shadow-[0_30px_100px_rgba(0,0,0,0.8),0_0_50px_rgba(235,160,54,0.08)] relative overflow-hidden animate-fade-in-scale" style={{ animationDelay: '0.4s' }}>
          <div className="w-full rounded-2xl bg-bg-secondary/90 border border-border-subtle/80 overflow-hidden flex flex-col shadow-2xl">
            {/* Mockup Window Header */}
            <div className="px-4 py-3 bg-bg-tertiary/70 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-semibold text-text-muted">Aetheria Vault — Galeri & Koleksi Kenangan</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                <ShieldCheck size={13} />
                <span>Enkripsi Aktif</span>
              </div>
            </div>

            {/* Mockup Window Body Content Preview */}
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Album Kenangan */}
              <div className="p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3.5 hover:border-accent-warm/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-accent-warm/15 text-accent-warm flex items-center justify-center shrink-0 shadow-lg">
                  <FolderHeart size={24} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-text-primary truncate">Foto Liburan & Keluarga</p>
                  <p className="text-xs text-text-muted mt-0.5">142 Kenangan • 3.2 GB</p>
                </div>
              </div>

              {/* Card 2: Video 4K Vault */}
              <div className="p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3.5 hover:border-accent-rose/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-accent-rose/15 text-accent-rose flex items-center justify-center shrink-0 shadow-lg">
                  <Film size={24} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-text-primary truncate">Dokumentasi Video 4K</p>
                  <p className="text-xs text-text-muted mt-0.5">28 Video • 14.8 GB</p>
                </div>
              </div>

              {/* Card 3: Berbagi Tautan Aman */}
              <div className="p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3.5 hover:border-accent-purple/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center shrink-0 shadow-lg">
                  <Share2 size={24} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-text-primary truncate">Link Share Berpassword</p>
                  <p className="text-xs text-text-muted mt-0.5">Tautan Publik Terenkripsi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature Grid Section ──────────────────────────────────── */}
      <section id="fitur" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 border-t border-border-subtle/50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-warm mb-2">
            FITUR UNGGULAN
          </h2>
          <p className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary">
            Semua yang Anda Butuhkan dalam Satu Brankas Awan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-accent-warm/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-accent-warm/15 text-accent-warm flex items-center justify-center mb-5 border border-accent-warm/25 shadow-lg group-hover:scale-110 transition-transform">
                <Zap size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Direct Native Streaming</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Putar video berukuran besar dan musik langsung di browser secara instan tanpa perlu menunggu download selesai. Didukung chunk streaming 512KB.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-accent-warm">
              <span>Kecepatan Penuh</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-accent-rose/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-accent-rose/15 text-accent-rose flex items-center justify-center mb-5 border border-accent-rose/25 shadow-lg group-hover:scale-110 transition-transform">
                <Share2 size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Berbagi Tautan Publik</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Kirim link download file atau album ke siapa saja tanpa mewajibkan penerima memiliki akun. Lengkap dengan proteksi kata sandi dan batas unduhan.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-accent-rose">
              <span>Proteksi Kata Sandi</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-accent-purple/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-accent-purple/15 text-accent-purple flex items-center justify-center mb-5 border border-accent-purple/25 shadow-lg group-hover:scale-110 transition-transform">
                <FolderHeart size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Album & Koleksi Cerdas</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Tata foto dan video ke dalam album khusus, beri catatan atau caption indah pada setiap media, dan navigasikan kenangan masa lalu dengan mudah.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-accent-purple">
              <span>Kategori Rapi</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/25 shadow-lg group-hover:scale-110 transition-transform">
                <ShieldCheck size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Enkripsi Tingkat Militer</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Seluruh data sesi login dan akses penyimpanan dienkripsi dengan standar AES-256-GCM. Berkas tersimpan aman tanpa risiko kebocoran pihak ketiga.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span>AES-256-GCM Secure</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-blue-500/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/25 shadow-lg group-hover:scale-110 transition-transform">
                <Smartphone size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Mode Desktop & Mobile</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Gunakan simulator mobile di layar desktop atau nikmati pengalaman responsif di smartphone Anda dengan bilah navigasi yang mulus dan intuitif.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400">
              <span>Multi-Platform</span>
              <CheckCircle2 size={14} />
            </div>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-3xl glass-strong border border-border-default/80 hover:border-amber-500/40 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300 shadow-xl">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/25 shadow-lg group-hover:scale-110 transition-transform">
                <QrCode size={26} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Login Instan Scan QR & OTP</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Tidak perlu mengingat password rumit. Cukup scan QR code dari kamera ponsel atau masukkan kode OTP langsung untuk masuk dalam hitungan detik.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-400">
              <span>Masuk 1 Detik</span>
              <CheckCircle2 size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security & Architecture Section ──────────────────────── */}
      <section id="arsitektur" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl glass-strong border border-border-default/80 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-warm/15 text-accent-warm text-xs font-bold mb-4">
                <Database size={14} />
                <span>ARSITEKTUR CLOUD MUTAKHIR</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Zero-Disk Buffer & Penyimpanan Awan Terdistribusi.
              </h2>
              <p className="text-sm text-text-secondary mt-4 leading-relaxed">
                Aetheria mengalirkan berkas secara langsung dari penyimpanan awan terdistribusi menuju browser Anda tanpa pernah menyimpan berkas di harddisk server perantara.
              </p>

              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3 text-xs text-text-secondary">
                  <CheckCircle2 size={16} className="text-accent-warm shrink-0 mt-0.5" />
                  <span><strong>Zero-Disk Write</strong>: Server tidak menumpuk file, menjamin privasi absolut.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-text-secondary">
                  <CheckCircle2 size={16} className="text-accent-warm shrink-0 mt-0.5" />
                  <span><strong>Database LibSQL Turso</strong>: Manajemen metadata kilat dengan latensi sub-milidetik.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-text-secondary">
                  <CheckCircle2 size={16} className="text-accent-warm shrink-0 mt-0.5" />
                  <span><strong>Enkripsi Sesi AES-256-GCM</strong>: Menjaga kredensial login Anda tetap aman di brankas database.</span>
                </div>
              </div>
            </div>

            {/* Architecture Visual Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-bg-secondary/70 border border-border-subtle flex flex-col gap-2">
                <Layers size={22} className="text-accent-warm" />
                <h4 className="font-bold text-sm text-text-primary">Storage Engine</h4>
                <p className="text-xs text-text-muted">Cloud Storage MTProto Terdistribusi Global</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-secondary/70 border border-border-subtle flex flex-col gap-2">
                <Database size={22} className="text-accent-rose" />
                <h4 className="font-bold text-sm text-text-primary">Database Engine</h4>
                <p className="text-xs text-text-muted">Turso / SQLite LibSQL Edge Engine</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-secondary/70 border border-border-subtle flex flex-col gap-2">
                <ShieldCheck size={22} className="text-emerald-400" />
                <h4 className="font-bold text-sm text-text-primary">Kriptografi</h4>
                <p className="text-xs text-text-muted">Enkripsi Simetris AES-256-GCM</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-secondary/70 border border-border-subtle flex flex-col gap-2">
                <HardDrive size={22} className="text-accent-purple" />
                <h4 className="font-bold text-sm text-text-primary">Kapasitas Penyimpanan</h4>
                <p className="text-xs text-text-muted">10 GB Gratis (Unlimited untuk Akun Whitelist) & 2GB per File</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ───────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10 border-t border-border-subtle/50">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-warm mb-2">
            PERTANYAAN UMUM
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Sering Ditanyakan Seputar Aetheria
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl glass-strong border border-border-subtle">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <HelpCircle size={18} className="text-accent-warm shrink-0" />
              Berapa kapasitas penyimpanan untuk akun saya?
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-2.5 leading-relaxed pl-6">
              Setiap pengguna mendapatkan kuota penyimpanan awan sebesar <strong>10 GB</strong> secara gratis untuk menyimpan foto, video, dan dokumen. Pengguna dengan kebutuhan khusus dapat didaftarkan dalam program Whitelist untuk akses kapasitas tanpa batas (Unlimited).
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-strong border border-border-subtle">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <HelpCircle size={18} className="text-accent-warm shrink-0" />
              Berapa batas maksimal ukuran untuk satu file?
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-2.5 leading-relaxed pl-6">
              Batas ukuran per file adalah hingga <strong>2 GB</strong> per berkas. Anda dapat mengunggah file video 4K panjang, file ISO, atau arsip ZIP besar tanpa kendala.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-strong border border-border-subtle">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <HelpCircle size={18} className="text-accent-warm shrink-0" />
              Apakah orang yang menerima link share harus login atau punya akun?
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-2.5 leading-relaxed pl-6">
              Tidak sama sekali. Siapa saja yang menerima link tautan berbagi dari Anda dapat langsung membuka pratinjau dan mengunduh berkas melalui browser mereka tanpa perlu mendaftar.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-strong border border-border-subtle">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <HelpCircle size={18} className="text-accent-warm shrink-0" />
              Bagaimana jika saya logout dari browser saya?
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-2.5 leading-relaxed pl-6">
              Link berbagi yang Anda kirimkan ke orang lain tetap dapat diunduh kapan saja secara aman, karena kunci sesi terenkripsi Anda tetap disimpan di server backend.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl gradient-warm p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl flex flex-col items-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.25)_0%,_transparent_70%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-2xl leading-tight">
            Mulai Simpan Kenangan Berharga Anda Hari Ini.
          </h2>
          <p className="mt-4 text-white/90 text-sm sm:text-base max-w-xl">
            Akses brankas awan tanpa batas dengan keamanan mutakhir dan kecepatan streaming penuh.
          </p>
          <button
            onClick={handleStart}
            className="mt-8 px-8 py-4 rounded-2xl bg-white text-bg-primary font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer btn-press"
          >
            <span>{isAuthenticated ? 'Buka Galeri Saya' : 'Masuk ke Aetheria Sekarang'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border-subtle/80 glass text-xs text-text-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg gradient-warm flex items-center justify-center text-white font-extrabold text-xs">
              A
            </div>
            <span className="font-bold text-text-primary">Aetheria Vault</span>
            <span>• Infinite Memory & Media Cloud</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#fitur" className="hover:text-text-primary transition-colors">Fitur</a>
            <a href="#keamanan" className="hover:text-text-primary transition-colors">Keamanan</a>
            <a href="#faq" className="hover:text-text-primary transition-colors">FAQ</a>
            <button onClick={() => navigate('/login')} className="hover:text-text-primary transition-colors font-bold text-accent-warm cursor-pointer">
              Login Vault
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
