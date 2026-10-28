import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  FolderArchive,
  Settings,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Lock,
  Share2,
  Search,
  UserPlus,
  RefreshCw,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  KeyRound,
  Loader2,
  Clock,
  Server,
  Database,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import {
  getAdminStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminFiles,
  deleteAdminFile,
  getAdminConfig,
} from '../services/api';
import type {
  AdminStats,
  AdminUserItem,
  AdminFileItem,
  AdminConfig,
} from '../domain/types';

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

type AdminTab = 'overview' | 'users' | 'files' | 'config';

export const AdminPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Files State
  const [filesList, setFilesList] = useState<AdminFileItem[]>([]);
  const [filesTotal, setFilesTotal] = useState(0);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [fileCategoryFilter, setFileCategoryFilter] = useState('');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    username: '',
    password: '',
    phone: '',
    first_name: '',
    last_name: '',
    role: 'user' as 'user' | 'admin',
    quota_gb: '10',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);

  const [quotaModalUser, setQuotaModalUser] = useState<AdminUserItem | null>(null);
  const [quotaInputGb, setQuotaInputGb] = useState('10');
  const [isQuotaUnlimited, setIsQuotaUnlimited] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUserItem | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<AdminFileItem | null>(null);

  // Protect Admin Access
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/pangurus/login', { replace: true });
      return;
    }
    if (user && user.role !== 'admin') {
      navigate('/drive', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Show temporary action message
  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Fetch Stats & Config
  const loadStatsAndConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, configData] = await Promise.all([
        getAdminStats(),
        getAdminConfig(),
      ]);
      setStats(statsData);
      setConfig(configData);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal memuat statistik');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const params: any = { limit: 50 };
      if (userSearch.trim()) params.search = userSearch.trim();
      if (userRoleFilter) params.role = userRoleFilter;
      if (userStatusFilter === 'active') params.is_banned = false;
      if (userStatusFilter === 'banned') params.is_banned = true;

      const res = await getAdminUsers(params);
      setUsersList(res.users);
      setUsersTotal(res.total);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal memuat pengguna');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // Fetch Files
  const loadFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const params: any = { limit: 50 };
      if (fileSearch.trim()) params.search = fileSearch.trim();
      if (fileCategoryFilter) params.category = fileCategoryFilter;

      const res = await getAdminFiles(params);
      setFilesList(res.files);
      setFilesTotal(res.total);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal memuat file');
    } finally {
      setFilesLoading(false);
    }
  }, [fileSearch, fileCategoryFilter]);

  useEffect(() => {
    loadStatsAndConfig();
  }, [loadStatsAndConfig]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'files') {
      loadFiles();
    }
  }, [activeTab, loadUsers, loadFiles]);

  // User Actions
  const handleToggleRole = async (targetUser: AdminUserItem) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await updateAdminUser(targetUser.id, { role: newRole });
      showNotification('success', `Role @${targetUser.username} diubah menjadi ${newRole}`);
      loadUsers();
      loadStatsAndConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal mengubah role');
    }
  };

  const handleToggleBan = async (targetUser: AdminUserItem) => {
    const newBanStatus = !targetUser.is_banned;
    try {
      await updateAdminUser(targetUser.id, { is_banned: newBanStatus });
      showNotification('success', `Status @${targetUser.username} berhasil diperbarui`);
      loadUsers();
      loadStatsAndConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal memperbarui status ban');
    }
  };

  const handleResetPin = async (targetUser: AdminUserItem) => {
    try {
      await updateAdminUser(targetUser.id, { reset_vault_pin: true });
      showNotification('success', `PIN Brankas @${targetUser.username} berhasil di-reset`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal me-reset PIN');
    }
  };

  const handleSaveQuota = async () => {
    if (!quotaModalUser) return;
    try {
      const currentUsed = quotaModalUser.storage_used || 0;
      const defaultQuotaBytes = config?.storageQuotaBytes || stats?.health?.defaultQuotaBytes || 10 * 1024 * 1024 * 1024;
      const effectiveBytes = isQuotaUnlimited
        ? -1
        : quotaInputGb === '0' || quotaInputGb === ''
        ? defaultQuotaBytes
        : (parseFloat(quotaInputGb) || 0) * 1024 * 1024 * 1024;

      if (!isQuotaUnlimited && effectiveBytes < currentUsed) {
        showNotification(
          'error',
          `Gagal mengubah kuota: Kuota baru (${formatBytes(effectiveBytes)}) tidak boleh lebih kecil dari data yang sudah digunakan (${formatBytes(currentUsed)}).`
        );
        return;
      }

      const quotaBytes = isQuotaUnlimited
        ? -1
        : quotaInputGb === '0' || quotaInputGb === ''
        ? null
        : parseFloat(quotaInputGb) * 1024 * 1024 * 1024;

      await updateAdminUser(quotaModalUser.id, { storage_quota_bytes: quotaBytes });
      const displayName = [quotaModalUser.first_name, quotaModalUser.last_name].filter(Boolean).join(' ') || (quotaModalUser.username ? `@${quotaModalUser.username}` : quotaModalUser.phone);
      showNotification(
        'success',
        `Kuota penyimpanan ${displayName} berhasil diatur ke ${
          isQuotaUnlimited ? 'Unlimited (⚡)' : quotaBytes ? `${quotaInputGb} GB` : 'Default Sistem (10 GB)'
        }`
      );
      setQuotaModalUser(null);
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal memperbarui kuota');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await deleteAdminUser(deleteConfirmUser.id);
      showNotification('success', `Akun @${deleteConfirmUser.username} berhasil dihapus`);
      setDeleteConfirmUser(null);
      loadUsers();
      loadStatsAndConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal menghapus pengguna');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.username.trim() || !addUserForm.password) {
      showNotification('error', 'Username dan password wajib diisi');
      return;
    }

    setAddUserLoading(true);
    try {
      const quotaBytes = addUserForm.quota_gb ? parseFloat(addUserForm.quota_gb) * 1024 * 1024 * 1024 : null;
      await createAdminUser({
        username: addUserForm.username.trim(),
        password: addUserForm.password,
        phone: addUserForm.phone.trim() || undefined,
        first_name: addUserForm.first_name.trim() || undefined,
        last_name: addUserForm.last_name.trim() || undefined,
        role: addUserForm.role,
        storage_quota_bytes: quotaBytes,
      });

      showNotification('success', `Pengguna @${addUserForm.username} berhasil dibuat`);
      setIsAddUserOpen(false);
      setAddUserForm({
        username: '',
        password: '',
        phone: '',
        first_name: '',
        last_name: '',
        role: 'user',
        quota_gb: '10',
      });
      loadUsers();
      loadStatsAndConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal membuat pengguna');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleDeleteFileConfirm = async () => {
    if (!deleteConfirmFile) return;
    try {
      await deleteAdminFile(deleteConfirmFile.id);
      showNotification('success', `File "${deleteConfirmFile.name}" berhasil dihapus dari cloud`);
      setDeleteConfirmFile(null);
      loadFiles();
      loadStatsAndConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Gagal menghapus file');
    }
  };

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col selection:bg-accent-warm/30 selection:text-white">
      {/* ─── Top Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border-default/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-rose to-accent-warm flex items-center justify-center shadow-lg shadow-accent-rose/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-text-primary">Aetheria</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-rose/15 text-accent-rose border border-accent-rose/30">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-text-muted hidden sm:block">Control Center & System Management</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Admin Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-warm to-accent-rose flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.username ? user.username.slice(0, 1).toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <p className="font-bold text-text-primary">@{user?.username || 'admin'}</p>
                <p className="text-[10px] text-accent-rose font-semibold">Super Administrator</p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/pangurus/login');
              }}
              title="Logout Admin"
              className="p-2 rounded-xl text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Notification Toast ─────────────────────────────────────── */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold backdrop-blur-xl ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200 shadow-emerald-500/10'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-200 shadow-rose-500/10'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* ─── Main Content Container ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-accent-rose to-accent-warm text-white shadow-md shadow-accent-rose/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Ikhtisar Sistem</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-accent-rose to-accent-warm text-white shadow-md shadow-accent-rose/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Users size={15} />
            <span>Manajemen Pengguna</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white">
              {usersTotal || stats?.totalUsers || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'files'
                ? 'bg-gradient-to-r from-accent-rose to-accent-warm text-white shadow-md shadow-accent-rose/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <FolderArchive size={15} />
            <span>Moderasi File & Media</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white">
              {filesTotal || stats?.totalFiles || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-accent-rose to-accent-warm text-white shadow-md shadow-accent-rose/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Settings size={15} />
            <span>Konfigurasi & Server</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW & SYSTEM HEALTH                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Users */}
              <div className="glass-strong rounded-2xl p-5 border border-border-default/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Pengguna</span>
                  <div className="w-8 h-8 rounded-xl bg-accent-warm/15 text-accent-warm flex items-center justify-center">
                    <Users size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-text-primary">
                    {stats ? stats.totalUsers : <Loader2 size={24} className="animate-spin text-text-muted" />}
                  </p>
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{stats?.activeUsers || 0} aktif</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{stats?.bannedUsers || 0} diblokir</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Files */}
              <div className="glass-strong rounded-2xl p-5 border border-border-default/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total File Cloud</span>
                  <div className="w-8 h-8 rounded-xl bg-accent-rose/15 text-accent-rose flex items-center justify-center">
                    <FolderArchive size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-text-primary">
                    {stats ? stats.totalFiles : <Loader2 size={24} className="animate-spin text-text-muted" />}
                  </p>
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-2">
                    <span>{stats?.totalFolders || 0} folder</span>
                    <span>•</span>
                    <span className="text-accent-rose font-bold">{stats?.totalVaultFiles || 0} di Brankas</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Storage */}
              <div className="glass-strong rounded-2xl p-5 border border-border-default/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Penyimpanan Terpakai</span>
                  <div className="w-8 h-8 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center">
                    <HardDrive size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-text-primary">
                    {stats ? formatBytes(stats.totalBytes) : <Loader2 size={24} className="animate-spin text-text-muted" />}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Disimpan aman di Telegram Bot Storage
                  </p>
                </div>
              </div>

              {/* Card 4: Shares */}
              <div className="glass-strong rounded-2xl p-5 border border-border-default/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tautan Berbagi Aktif</span>
                  <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                    <Share2 size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-text-primary">
                    {stats ? stats.totalShares : <Loader2 size={24} className="animate-spin text-text-muted" />}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Tautan publik aktif yang dapat diakses tamu
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Distribution & Health Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Storage Breakdown */}
              <div className="lg:col-span-2 glass-strong rounded-3xl p-6 border border-border-default/80">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                  <HardDrive size={16} className="text-accent-warm" />
                  <span>Distribusi Jenis File</span>
                </h3>

                {stats && (
                  <div className="space-y-4">
                    {/* Visual Progress Bar */}
                    <div className="h-4 w-full rounded-full bg-bg-tertiary overflow-hidden flex">
                      {['image', 'video', 'audio', 'document', 'other'].map((cat) => {
                        const bytes = stats.breakdown[cat]?.bytes || 0;
                        const pct = stats.totalBytes > 0 ? (bytes / stats.totalBytes) * 100 : 0;
                        if (pct <= 0) return null;

                        const colorClass =
                          cat === 'image'
                            ? 'bg-accent-warm'
                            : cat === 'video'
                            ? 'bg-accent-rose'
                            : cat === 'audio'
                            ? 'bg-accent-purple'
                            : cat === 'document'
                            ? 'bg-accent-cyan'
                            : 'bg-text-muted';

                        return (
                          <div
                            key={cat}
                            style={{ width: `${pct}%` }}
                            className={`${colorClass} h-full transition-all`}
                            title={`${cat}: ${formatBytes(bytes)} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Breakdown Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent-warm/15 text-accent-warm flex items-center justify-center shrink-0">
                          <ImageIcon size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Foto & Gambar</p>
                          <p className="text-[11px] text-text-muted">
                            {formatBytes(stats.breakdown.image?.bytes || 0)} • {stats.breakdown.image?.count || 0} file
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent-rose/15 text-accent-rose flex items-center justify-center shrink-0">
                          <Video size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Video</p>
                          <p className="text-[11px] text-text-muted">
                            {formatBytes(stats.breakdown.video?.bytes || 0)} • {stats.breakdown.video?.count || 0} file
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center shrink-0">
                          <Music size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Audio & Musik</p>
                          <p className="text-[11px] text-text-muted">
                            {formatBytes(stats.breakdown.audio?.bytes || 0)} • {stats.breakdown.audio?.count || 0} file
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                          <FileText size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Dokumen & PDF</p>
                          <p className="text-[11px] text-text-muted">
                            {formatBytes(stats.breakdown.document?.bytes || 0)} • {stats.breakdown.document?.count || 0} file
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-text-muted/15 text-text-muted flex items-center justify-center shrink-0">
                          <FolderArchive size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Lainnya</p>
                          <p className="text-[11px] text-text-muted">
                            {formatBytes(stats.breakdown.other?.bytes || 0)} • {stats.breakdown.other?.count || 0} file
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-bg-tertiary/60 border border-border-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                          <Lock size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Brankas Rahasia</p>
                          <p className="text-[11px] text-text-muted">
                            {stats.totalVaultFiles} file terenkripsi
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* System Health */}
              <div className="glass-strong rounded-3xl p-6 border border-border-default/80 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                    <Server size={16} className="text-accent-rose" />
                    <span>Status Layanan</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/50">
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-emerald-400" />
                        <span className="font-semibold text-text-primary">Database Cloud</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Online
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/50">
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-emerald-400" />
                        <span className="font-semibold text-text-primary">Telegram Storage</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Siap
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/50">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-accent-warm" />
                        <span className="font-semibold text-text-primary">Server Uptime</span>
                      </div>
                      <span className="font-mono text-text-secondary">
                        {stats?.health ? `${Math.floor(stats.health.uptimeSeconds / 60)} menit` : '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/50">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-accent-purple" />
                        <span className="font-semibold text-text-primary">Kuota Standar</span>
                      </div>
                      <span className="font-bold text-accent-warm">10 GB / Akun</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">Aetheria Cloud Engine v1.0</span>
                  <button
                    onClick={loadStatsAndConfig}
                    className="flex items-center gap-1.5 text-xs text-accent-warm hover:underline cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 2: USER MANAGEMENT                                       */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Cari username, nama, atau no HP..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-xs font-semibold text-text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Role</option>
                  <option value="admin">Administrator</option>
                  <option value="user">User Biasa</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-xs font-semibold text-text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="banned">Diblokir</option>
                </select>

                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-rose to-accent-warm text-white text-xs font-bold shadow-md shadow-accent-rose/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <UserPlus size={14} />
                  <span>+ Tambah Akun</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-strong rounded-3xl border border-border-default/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-tertiary/70 text-text-secondary font-bold uppercase tracking-wider border-b border-border-subtle text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Pengguna</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Penyimpanan Terpakai</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-text-muted">
                          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-accent-warm" />
                          <span>Memuat daftar pengguna...</span>
                        </td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-text-muted">
                          Tidak ada pengguna yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => {
                        const isSelf = user?.id === u.id.toString() || user?.username === u.username;
                        const isUnlimited = u.is_unlimited || u.storage_quota_bytes === -1;
                        const quotaLimit = u.storage_quota_bytes !== null && u.storage_quota_bytes > 0 ? u.storage_quota_bytes : 10 * 1024 * 1024 * 1024;
                        const usedPct = !isUnlimited && quotaLimit > 0 ? Math.min(100, (u.storage_used / quotaLimit) * 100) : 0;

                        return (
                          <tr key={u.id} className="hover:bg-bg-tertiary/40 transition-colors">
                            {/* User details */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent-rose/30 to-accent-warm/30 border border-border-subtle flex items-center justify-center font-bold text-text-primary text-xs shrink-0">
                                  {(u.first_name || u.username || 'U').slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-text-primary">
                                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : 'Pengguna')}
                                    </span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-accent-warm/20 text-accent-warm">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-text-muted text-[11px]">
                                    {u.username ? `@${u.username} • ` : ''}{u.phone}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-5 py-4">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-rose/15 text-accent-rose border border-accent-rose/30">
                                  <Shield size={11} />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-tertiary text-text-secondary border border-border-subtle">
                                  <span>User Biasa</span>
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              {u.is_banned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <ShieldAlert size={11} />
                                  <span>Diblokir</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={11} />
                                  <span>Aktif</span>
                                </span>
                              )}
                            </td>

                            {/* Storage usage */}
                            <td className="px-5 py-4">
                              {isUnlimited ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                                  <span>⚡ Unlimited Storage</span>
                                </span>
                              ) : (
                                <div className="w-40 space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="font-bold text-text-primary">{formatBytes(u.storage_used)}</span>
                                    <span className="text-text-muted">{formatBytes(quotaLimit)}</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-bg-tertiary overflow-hidden">
                                    <div
                                      style={{ width: `${usedPct}%` }}
                                      className={`h-full rounded-full ${
                                        usedPct > 90 ? 'bg-rose-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-accent-warm'
                                      }`}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Role toggle */}
                                {!isSelf && (
                                  <button
                                    onClick={() => handleToggleRole(u)}
                                    title={u.role === 'admin' ? 'Jadikan User Biasa' : 'Jadikan Admin'}
                                    className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                                  >
                                    <Shield size={14} className={u.role === 'admin' ? 'text-accent-rose' : ''} />
                                  </button>
                                )}

                                {/* Ban toggle */}
                                {!isSelf && (
                                  <button
                                    onClick={() => handleToggleBan(u)}
                                    title={u.is_banned ? 'Buka Blokir' : 'Blokir Pengguna'}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      u.is_banned
                                        ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                        : 'bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-rose-400'
                                    }`}
                                  >
                                    <ShieldAlert size={14} />
                                  </button>
                                )}

                                {/* Reset PIN Brankas */}
                                <button
                                  onClick={() => handleResetPin(u)}
                                  title="Reset PIN Brankas Rahasia"
                                  className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent-warm transition-colors cursor-pointer"
                                >
                                  <KeyRound size={14} />
                                </button>

                                {/* Custom Quota */}
                                <button
                                  onClick={() => {
                                    setQuotaModalUser(u);
                                    const isUserUnl = u.is_unlimited || u.storage_quota_bytes === -1;
                                    setIsQuotaUnlimited(isUserUnl);
                                    setQuotaInputGb(
                                      !isUserUnl && u.storage_quota_bytes !== null && u.storage_quota_bytes > 0
                                        ? (u.storage_quota_bytes / (1024 * 1024 * 1024)).toString()
                                        : '10'
                                    );
                                  }}
                                  title="Atur Kuota Penyimpanan"
                                  className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-accent-cyan transition-colors cursor-pointer"
                                >
                                  <HardDrive size={14} />
                                </button>

                                {/* Delete user */}
                                {!isSelf && (
                                  <button
                                    onClick={() => setDeleteConfirmUser(u)}
                                    title="Hapus Akun Pengguna"
                                    className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 3: FILE MODERATION & EXPLORER                            */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'files' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Cari file berdasarkan nama atau pemilik..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={fileCategoryFilter}
                  onChange={(e) => setFileCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-xs font-semibold text-text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Kategori</option>
                  <option value="image">Gambar & Foto</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio & Musik</option>
                  <option value="document">Dokumen / PDF</option>
                  <option value="vault">Di Brankas Rahasia</option>
                </select>

                <button
                  onClick={loadFiles}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary text-xs font-bold border border-border-subtle transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw size={13} />
                  <span>Segarkan</span>
                </button>
              </div>
            </div>

            {/* Files Table */}
            <div className="glass-strong rounded-3xl border border-border-default/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-tertiary/70 text-text-secondary font-bold uppercase tracking-wider border-b border-border-subtle text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Nama File</th>
                      <th className="px-5 py-3.5">Ukuran</th>
                      <th className="px-5 py-3.5">Pemilik</th>
                      <th className="px-5 py-3.5">Status Brankas</th>
                      <th className="px-5 py-3.5">Tanggal Upload</th>
                      <th className="px-5 py-3.5 text-right">Aksi Moderasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filesLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-accent-warm" />
                          <span>Memuat daftar file sistem...</span>
                        </td>
                      </tr>
                    ) : filesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                          Tidak ada file yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filesList.map((f) => {
                        return (
                          <tr key={f.id} className="hover:bg-bg-tertiary/40 transition-colors">
                            {/* File Name */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md truncate">
                                {f.mime_type.startsWith('image/') ? (
                                  <ImageIcon size={16} className="text-accent-warm shrink-0" />
                                ) : f.mime_type.startsWith('video/') ? (
                                  <Video size={16} className="text-accent-rose shrink-0" />
                                ) : f.mime_type.startsWith('audio/') ? (
                                  <Music size={16} className="text-accent-purple shrink-0" />
                                ) : (
                                  <FileText size={16} className="text-accent-cyan shrink-0" />
                                )}
                                <span className="font-semibold text-text-primary truncate" title={f.name}>
                                  {f.name}
                                </span>
                              </div>
                            </td>

                            {/* Size */}
                            <td className="px-5 py-3.5 font-mono text-text-secondary">
                              {formatBytes(f.size)}
                            </td>

                            {/* Owner */}
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="font-bold text-text-primary">
                                  {f.owner_name || (f.owner_username ? `@${f.owner_username}` : 'Pengguna')}
                                </p>
                                <p className="text-[10px] text-text-muted">
                                  {f.owner_username ? `@${f.owner_username} • ` : ''}{f.owner_phone}
                                </p>
                              </div>
                            </td>

                            {/* Vault */}
                            <td className="px-5 py-3.5">
                              {f.is_vault ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <Lock size={10} />
                                  <span>Brankas</span>
                                </span>
                              ) : (
                                <span className="text-text-muted text-[11px]">-</span>
                              )}
                            </td>

                            {/* Created At */}
                            <td className="px-5 py-3.5 text-text-muted text-[11px]">
                              {new Date(f.created_at).toLocaleDateString('id-ID')}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => setDeleteConfirmFile(f)}
                                title="Hapus Permanen File Ini"
                                className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB 4: CONFIGURATION & SERVER INFO                           */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'config' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="glass-strong rounded-3xl p-6 border border-border-default/80 space-y-5">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Settings size={16} className="text-accent-warm" />
                <span>Konfigurasi Penyimpanan & Batasan Kuota</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle space-y-1">
                  <p className="text-text-muted text-[11px] font-semibold">Batas Kuota Standar</p>
                  <p className="text-xl font-extrabold text-accent-warm">10 GB / Akun</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Setiap akun pengguna biasa dibatasi maksimal 10 GB penyimpanan total.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-bg-tertiary/60 border border-border-subtle space-y-1">
                  <p className="text-text-muted text-[11px] font-semibold">Penyimpanan Terpasang</p>
                  <p className="text-xl font-extrabold text-text-primary">Telegram Cloud (Unlimited)</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    File dienkripsi dan dipecah otomatis ke Saved Messages Telegram backend.
                  </p>
                </div>
              </div>

              {/* Server Info */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Server size={14} className="text-accent-rose" />
                  <span>Informasi Node Runtime</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-bg-tertiary/50">
                    <p className="text-text-muted text-[10px]">Node Version</p>
                    <p className="font-mono font-bold text-text-primary">{stats?.health.nodeVersion || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-tertiary/50">
                    <p className="text-text-muted text-[10px]">Port HTTP</p>
                    <p className="font-mono font-bold text-text-primary">{config?.port || '8080'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-tertiary/50">
                    <p className="text-text-muted text-[10px]">Memory Heap</p>
                    <p className="font-mono font-bold text-text-primary">
                      {stats ? formatBytes(stats.health.memoryUsedBytes) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: TAMBAH PENGGUNA ─────────────────────────────────── */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md glass-strong rounded-3xl p-6 border border-border-default/80 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-accent-rose" />
                <h3 className="text-sm font-extrabold text-text-primary">Tambah Akun Baru</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-text-secondary block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={addUserForm.username}
                  onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })}
                  placeholder="misal: john_doe"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                />
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">Kata Sandi *</label>
                <input
                  type="password"
                  required
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-secondary block mb-1">Nama Depan</label>
                  <input
                    type="text"
                    value={addUserForm.first_name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                  />
                </div>
                <div>
                  <label className="font-bold text-text-secondary block mb-1">Nama Belakang</label>
                  <input
                    type="text"
                    value={addUserForm.last_name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, last_name: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-secondary block mb-1">Nomor HP (Opsional)</label>
                <input
                  type="text"
                  value={addUserForm.phone}
                  onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                  placeholder="+628123456789"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-secondary block mb-1">Role Akun</label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none cursor-pointer"
                  >
                    <option value="user">User Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-secondary block mb-1">Kuota Storage (GB)</label>
                  <input
                    type="number"
                    value={addUserForm.quota_gb}
                    onChange={(e) => setAddUserForm({ ...addUserForm, quota_gb: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-elevated text-text-secondary text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent-rose to-accent-warm text-white text-xs font-bold shadow-md shadow-accent-rose/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {addUserLoading ? <Loader2 size={14} className="animate-spin" /> : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ATUR KUOTA PENGGUNA ─────────────────────────────── */}
      {quotaModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-strong rounded-3xl p-6 border border-border-default/80 shadow-2xl animate-fade-in-up">
            <h3 className="text-sm font-extrabold text-text-primary mb-1">Atur Kuota Penyimpanan</h3>
            <p className="text-xs text-text-muted mb-3">
              Pengguna: <strong className="text-text-primary">{[quotaModalUser.first_name, quotaModalUser.last_name].filter(Boolean).join(' ') || (quotaModalUser.username ? `@${quotaModalUser.username}` : quotaModalUser.phone)}</strong>
            </p>

            {/* Current Storage Used Info */}
            <div className="p-3 rounded-2xl bg-bg-tertiary border border-border-subtle flex items-center justify-between text-xs mb-3">
              <span className="text-text-muted font-medium">Data Terpakai Saat Ini:</span>
              <span className="font-extrabold text-accent-warm">{formatBytes(quotaModalUser.storage_used || 0)}</span>
            </div>

            <div className="space-y-4">
              {/* Option Mode: Unlimited vs Batas Tertentu */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-bg-tertiary border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsQuotaUnlimited(false)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isQuotaUnlimited
                      ? 'bg-accent-warm text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Batas Kuota (GB)
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuotaUnlimited(true)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isQuotaUnlimited
                      ? 'bg-accent-cyan text-black shadow-sm font-extrabold'
                      : 'text-text-secondary hover:text-accent-cyan'
                  }`}
                >
                  ⚡ Unlimited
                </button>
              </div>

              {isQuotaUnlimited ? (
                <div className="p-3.5 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/30 text-xs text-accent-cyan leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <span>⚡ Kuota Tanpa Batas Aktif</span>
                  </p>
                  <p className="text-[11px] opacity-90">
                    Pengguna ini bebas mengunggah foto, video, dan dokumen tanpa batasan kapasitas storage (Unlimited).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">Kapasitas Maksimal (GB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={quotaInputGb}
                    onChange={(e) => setQuotaInputGb(e.target.value)}
                    placeholder="misal: 10, 50, atau 100"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary focus:outline-none focus:border-accent-warm text-xs"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Masukkan 0 untuk menggunakan kuota default sistem (10 GB).
                  </p>
                </div>
              )}

              {(() => {
                const currentUsed = quotaModalUser.storage_used || 0;
                const defaultQuotaBytes = config?.storageQuotaBytes || stats?.health?.defaultQuotaBytes || 10 * 1024 * 1024 * 1024;
                const targetBytes = quotaInputGb === '0' || quotaInputGb === ''
                  ? defaultQuotaBytes
                  : (parseFloat(quotaInputGb) || 0) * 1024 * 1024 * 1024;
                const isTooSmall = !isQuotaUnlimited && targetBytes < currentUsed;

                if (isTooSmall) {
                  return (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs leading-relaxed flex items-start gap-2 font-medium animate-fade-in">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>
                        Kuota baru <strong>({formatBytes(targetBytes)})</strong> tidak boleh lebih kecil dari data yang sudah digunakan <strong>({formatBytes(currentUsed)})</strong>.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {(() => {
                const currentUsed = quotaModalUser.storage_used || 0;
                const defaultQuotaBytes = config?.storageQuotaBytes || stats?.health?.defaultQuotaBytes || 10 * 1024 * 1024 * 1024;
                const targetBytes = quotaInputGb === '0' || quotaInputGb === ''
                  ? defaultQuotaBytes
                  : (parseFloat(quotaInputGb) || 0) * 1024 * 1024 * 1024;
                const isTooSmall = !isQuotaUnlimited && targetBytes < currentUsed;

                return (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => setQuotaModalUser(null)}
                      className="px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary text-xs font-bold cursor-pointer hover:bg-bg-elevated"
                    >
                      Batal
                    </button>
                    <button
                      disabled={isTooSmall}
                      onClick={handleSaveQuota}
                      className="px-4 py-2 rounded-xl bg-accent-warm hover:bg-accent-warm/90 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Simpan Kuota
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: KONFIRMASI HAPUS USER ───────────────────────────── */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-strong rounded-3xl p-6 border border-rose-500/30 shadow-2xl animate-fade-in-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h3 className="text-sm font-extrabold text-text-primary mb-1">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Anda akan menghapus akun <strong className="text-rose-400">{[deleteConfirmUser.first_name, deleteConfirmUser.last_name].filter(Boolean).join(' ') || (deleteConfirmUser.username ? `@${deleteConfirmUser.username}` : deleteConfirmUser.phone)}</strong> beserta seluruh file, folder, dan tautan share terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: KONFIRMASI HAPUS FILE ───────────────────────────── */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-strong rounded-3xl p-6 border border-rose-500/30 shadow-2xl animate-fade-in-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h3 className="text-sm font-extrabold text-text-primary mb-1">Hapus File dari Cloud?</h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed truncate px-2">
              File <strong className="text-rose-400 font-mono">"{deleteConfirmFile.name}"</strong> milik{' '}
              <strong className="text-text-primary">{deleteConfirmFile.owner_name || (deleteConfirmFile.owner_username ? `@${deleteConfirmFile.owner_username}` : deleteConfirmFile.owner_phone || 'pengguna')}</strong> akan dihapus secara permanen dari server.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                className="px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteFileConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
