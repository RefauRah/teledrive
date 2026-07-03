import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchQuery,
  onSearchChange,
  onMenuClick,
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
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-var(--sidebar-width))] h-16 bg-surface dark:bg-background flex items-center justify-between px-margin-mobile lg:px-margin-desktop ml-auto z-30 border-b border-surface-dim transition-all duration-300">
      {/* Mobile Menu Button / Left Spacer */}
      <div className="flex items-center lg:w-[200px]">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none rounded-full flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      {/* Search Input Area */}
      <div className="flex-1 max-w-xl mx-auto px-2 lg:px-8">
        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary rounded-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Search in CloudStorage"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-12 pr-4 font-body-sm text-body-sm focus:outline-none placeholder:text-on-surface-variant text-on-surface"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center justify-end gap-4 lg:w-[200px]">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
          <span className="material-symbols-outlined">help</span>
        </button>

        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="relative" ref={menuRef}>
          <div 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-8 h-8 rounded-full overflow-hidden ml-2 ring-2 ring-transparent hover:ring-primary cursor-pointer transition-all flex items-center justify-center bg-primary text-on-primary font-bold"
            title="Profile Menu"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initial.toUpperCase()
            )}
          </div>

          {/* Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 py-2 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-outline-variant/30">
                <p className="text-sm font-bold text-on-surface truncate">{user?.firstName || user?.username || 'User'}</p>
                <p className="text-xs text-on-surface-variant truncate mt-0.5">{user?.phone || 'No phone number'}</p>
              </div>
              <div className="py-1">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-3 font-medium"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  My Profile
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3 font-medium"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
