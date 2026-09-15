import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Search, Upload, LogOut, FolderPlus, Sparkles } from 'lucide-react';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUploadClick: () => void;
  onCreateAlbumClick?: () => void;
  onVaultClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchQuery,
  onSearchChange,
  onUploadClick,
  onCreateAlbumClick,
  onVaultClick,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const initial = user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U';

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-accent-warm/20 group-hover:shadow-accent-warm/30 transition-shadow">
            A
          </div>
          <h1 className="text-lg font-extrabold gradient-warm-text hidden sm:block tracking-wide">
            Aetheria
          </h1>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-4">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-warm transition-colors" />
            <input
              type="text"
              placeholder="Cari kenangan atau album..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-bg-tertiary/80 border border-border-subtle rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warm/30 focus:bg-bg-tertiary transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Vault Status button */}
          {onVaultClick && (
            <button
              onClick={onVaultClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-warm/10 hover:bg-accent-warm/20 border border-accent-warm/25 text-accent-warm text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Aetheria Vault Status"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span className="hidden sm:inline">Vault</span>
            </button>
          )}

          {/* Create Album button */}
          {onCreateAlbumClick && (
            <button
              onClick={onCreateAlbumClick}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-subtle hover:border-accent-warm/30 text-sm font-semibold transition-all cursor-pointer shadow-sm"
              title="Buat Album Baru"
            >
              <FolderPlus size={16} className="text-accent-warm" />
              <span>+ Album</span>
            </button>
          )}

          {/* Upload button */}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 gradient-warm rounded-xl text-white font-medium text-sm btn-press shadow-lg shadow-accent-warm/20 hover:shadow-accent-warm/30 transition-shadow cursor-pointer"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-accent-warm/50 cursor-pointer transition-all flex items-center justify-center bg-bg-tertiary text-text-primary font-bold text-sm ml-1"
            >
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initial.toUpperCase()
              )}
            </button>

            {/* Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 glass-strong rounded-xl py-2 z-50 animate-fade-in-scale shadow-2xl">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {user?.firstName || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {user?.phone || 'No phone'}
                  </p>
                </div>
                <div className="py-1">
                  {onVaultClick && (
                    <button
                      className="w-full px-4 py-2.5 text-left text-sm text-text-primary hover:bg-bg-tertiary/60 transition-colors flex items-center gap-3 font-medium cursor-pointer"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onVaultClick();
                      }}
                    >
                      <Sparkles size={16} className="text-accent-warm" />
                      Aetheria Vault
                    </button>
                  )}
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm text-error/80 hover:text-error hover:bg-error/5 transition-colors flex items-center gap-3 font-medium cursor-pointer"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
