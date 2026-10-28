import { create } from 'zustand';
import type { User } from '../domain/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
  updateUser: (userFields: Partial<User>) => void;
}

// Clear any legacy persistent tokens from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  } catch {}
}

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('auth_token');
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = sessionStorage.getItem('auth_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    return null;
  }
};

const initialToken = getStoredToken();
const initialUser = getStoredUser();
const initialIsAuthenticated = Boolean(initialToken && initialUser);

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser,
  isAuthenticated: initialIsAuthenticated,

  login: (token: string, user: User) => {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    sessionStorage.removeItem('server_instance_id');
    // Clear localStorage to ensure no persistent leakage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('server_instance_id');
    sessionStorage.removeItem('vault_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) {
      set({ token, user, isAuthenticated: true });
    } else {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  updateUser: (userFields: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...userFields };
      sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));
