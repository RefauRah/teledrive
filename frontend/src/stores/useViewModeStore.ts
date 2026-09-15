import { create } from 'zustand';

export type ViewMode = 'desktop' | 'mobile';

interface ViewModeState {
  viewMode: ViewMode;
  isMobileDevice: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const getInitialMode = (): { viewMode: ViewMode; isMobileDevice: boolean } => {
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const saved = typeof window !== 'undefined' ? localStorage.getItem('aetheria_view_mode') : null;

  if (saved === 'desktop' || saved === 'mobile') {
    return { viewMode: saved, isMobileDevice: isMobileScreen };
  }

  return {
    viewMode: isMobileScreen ? 'mobile' : 'desktop',
    isMobileDevice: isMobileScreen,
  };
};

export const useViewModeStore = create<ViewModeState>((set, get) => {
  const initial = getInitialMode();

  return {
    viewMode: initial.viewMode,
    isMobileDevice: initial.isMobileDevice,
    setViewMode: (mode) => {
      localStorage.setItem('aetheria_view_mode', mode);
      set({ viewMode: mode });
    },
    toggleViewMode: () => {
      const next = get().viewMode === 'desktop' ? 'mobile' : 'desktop';
      localStorage.setItem('aetheria_view_mode', next);
      set({ viewMode: next });
    },
  };
});
