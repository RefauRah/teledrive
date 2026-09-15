import React from 'react';
import { Home, FolderPlus, Upload, Sparkles, User, Monitor } from 'lucide-react';
import { useViewModeStore } from '../../stores/useViewModeStore';

interface MobileNavProps {
  onHomeClick: () => void;
  onCreateAlbumClick: () => void;
  onUploadClick: () => void;
  onVaultClick: () => void;
  onProfileClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  onHomeClick,
  onCreateAlbumClick,
  onUploadClick,
  onVaultClick,
  onProfileClick,
}) => {
  const { toggleViewMode, isMobileDevice } = useViewModeStore();

  return (
    <nav className={`${isMobileDevice ? 'fixed' : 'sticky'} bottom-0 inset-x-0 z-40 bg-bg-secondary/95 backdrop-blur-2xl border-t border-border-subtle/80 px-2 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.5)] select-none shrink-0`}>
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Home / Gallery */}
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-text-secondary hover:text-accent-warm active:scale-95 transition-all cursor-pointer group"
          title="Beranda Galeri"
        >
          <Home size={20} className="group-hover:text-accent-warm transition-colors" />
          <span className="text-[10px] font-medium tracking-tight">Galeri</span>
        </button>

        {/* Create Album */}
        <button
          onClick={onCreateAlbumClick}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-text-secondary hover:text-accent-warm active:scale-95 transition-all cursor-pointer group"
          title="Buat Album"
        >
          <FolderPlus size={20} className="group-hover:text-accent-warm transition-colors" />
          <span className="text-[10px] font-medium tracking-tight">+ Album</span>
        </button>

        {/* Center Floating Upload Button */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            onClick={onUploadClick}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-warm via-accent-rose to-accent-purple p-0.5 shadow-xl shadow-accent-warm/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Upload Media"
          >
            <div className="w-full h-full bg-gradient-to-tr from-accent-warm to-accent-rose rounded-[14px] flex items-center justify-center text-bg-primary font-bold">
              <Upload size={22} className="stroke-[2.5]" />
            </div>
          </button>
          <span className="text-[10px] font-bold text-accent-warm mt-0.5">Upload</span>
        </div>

        {/* Vault Status */}
        <button
          onClick={onVaultClick}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-text-secondary hover:text-accent-warm active:scale-95 transition-all cursor-pointer group"
          title="Aetheria Vault"
        >
          <Sparkles size={20} className="group-hover:text-accent-warm text-accent-warm/80 transition-colors" />
          <span className="text-[10px] font-medium tracking-tight">Vault</span>
        </button>

        {/* Switch Mode / Profile */}
        {!isMobileDevice ? (
          <button
            onClick={toggleViewMode}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-text-secondary hover:text-accent-warm active:scale-95 transition-all cursor-pointer group"
            title="Beralih ke Mode Desktop"
          >
            <Monitor size={20} className="group-hover:text-accent-warm transition-colors" />
            <span className="text-[10px] font-medium tracking-tight">Desktop</span>
          </button>
        ) : (
          <button
            onClick={onProfileClick}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-text-secondary hover:text-accent-warm active:scale-95 transition-all cursor-pointer group"
            title="Profil Akun"
          >
            <User size={20} className="group-hover:text-accent-warm transition-colors" />
            <span className="text-[10px] font-medium tracking-tight">Profil</span>
          </button>
        )}
      </div>
    </nav>
  );
};
