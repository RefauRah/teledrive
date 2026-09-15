import React from 'react';
import { ChevronRight, Home, FolderPlus, ArrowLeft } from 'lucide-react';
import type { BreadcrumbItem } from '../../domain/types';
import { useViewModeStore } from '../../stores/useViewModeStore';

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onCreateAlbum: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  breadcrumbs,
  currentFolderId,
  onNavigate,
  onCreateAlbum,
}) => {
  const { viewMode } = useViewModeStore();
  const isInsideFolder = currentFolderId !== null;

  return (
    <div className="flex items-center justify-between gap-2 py-2 px-1 mb-2 border-b border-border-subtle/40 overflow-hidden">
      {/* Path trail */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-sm flex-nowrap shrink">
        {isInsideFolder && (
          <button
            onClick={() => {
              if (breadcrumbs.length <= 1) {
                onNavigate(null);
              } else {
                const parent = breadcrumbs[breadcrumbs.length - 2];
                onNavigate(parent ? parent.id : null);
              }
            }}
            className="mr-1 p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex items-center justify-center shrink-0"
            title="Kembali"
          >
            <ArrowLeft size={15} />
          </button>
        )}

        {/* Root */}
        <button
          onClick={() => onNavigate(null)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-medium shrink-0 ${
            !currentFolderId
              ? 'text-accent-warm bg-accent-warm/10 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
          }`}
        >
          <Home size={14} />
          <span className="text-xs sm:text-sm">Semua Kenangan</span>
        </button>

        {/* Trail Items */}
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={item.id || idx}>
              <ChevronRight size={13} className="text-text-muted/60 shrink-0" />
              <button
                onClick={() => onNavigate(item.id)}
                disabled={isLast}
                className={`px-2 py-1 rounded-lg transition-all font-medium max-w-[140px] sm:max-w-[200px] truncate shrink-0 text-xs sm:text-sm ${
                  isLast
                    ? 'text-accent-warm bg-accent-warm/10 shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                {item.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick Action: Buat Album Baru (hidden in mobile mode as it is in bottom nav) */}
      {viewMode === 'desktop' && (
        <button
          onClick={onCreateAlbum}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold border border-border-subtle hover:border-accent-warm/30 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          <FolderPlus size={14} className="text-accent-warm" />
          <span>+ Album Baru</span>
        </button>
      )}
    </div>
  );
};
