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

const initialToken = localStorage.getItem('auth_token');
const initialUserStr = localStorage.getItem('auth_user');
let initialUser: User | null = null;
let initialIsAuthenticated = false;

if (initialToken && initialUserStr) {
  try {
    initialUser = JSON.parse(initialUserStr) as User;
    initialIsAuthenticated = true;
  } catch {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser,
  isAuthenticated: initialIsAuthenticated,

  login: (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ token, user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        set({ token: null, user: null, isAuthenticated: false });
      }
    }
  },

  updateUser: (userFields: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...userFields };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));
