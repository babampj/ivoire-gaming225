'use client'
import { create } from 'zustand';
import { storage, api, setTokens } from '../services';
import { connectSocket, disconnectSocket } from '../socket';
import { getErrorMessage } from '../services';
import type { Me } from '../types';

export type AuthStatus = 'loading' | 'auth' | 'guest';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  city: string;
  birthDate?: string;
  gameSlugs?: string[];
}

interface AuthState {
  user: Me | null;
  status: AuthStatus;
  connecting: boolean;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateFavorites: (slugs: string[]) => Promise<void>;
  updateUser: (patch: Partial<Me>) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  connecting: false,

  async bootstrap() {
    try {
      const tokens = storage.getTokens();
      if (!tokens.access || !tokens.refresh) {
        set({ status: 'guest' });
        return;
      }
      setTokens(tokens.access, tokens.refresh);
      connectSocket();
      const res = await api.get('/users/me');
      set({ user: res.data.data, status: 'auth' });
      storage.saveUser(res.data.data);
    } catch {
      setTokens(null, null);
      disconnectSocket();
      set({ user: null, status: 'guest' });
    }
  },

  async login(identifier, password) {
    set({ connecting: true });
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const { user, tokens } = res.data.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
      storage.saveTokens(tokens.accessToken, tokens.refreshToken);
      storage.saveUser(user);
      connectSocket();
      set({ user, status: 'auth' });
    } finally {
      set({ connecting: false });
    }
  },

  async register(payload) {
    set({ connecting: true });
    try {
      const res = await api.post('/auth/register', payload);
      const { user, tokens } = res.data.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
      storage.saveTokens(tokens.accessToken, tokens.refreshToken);
      storage.saveUser(user);
      connectSocket();
      set({ user, status: 'auth' });
    } finally {
      set({ connecting: false });
    }
  },

  async logout() {
    try {
      const stored = storage.getTokens();
      if (stored.refresh) {
        await api
          .post('/auth/logout', { refreshToken: stored.refresh })
          .catch(() => undefined);
      }
    } finally {
      disconnectSocket();
      setTokens(null, null);
      storage.clear();
      set({ user: null, status: 'guest' });
    }
  },

  async updateFavorites(slugs) {
    const res = await api.patch('/users/me/favorites', { gameSlugs: slugs });
    set((s) => ({ user: s.user ? { ...s.user, favorites: res.data.data.favorites } : s.user }));
  },

  updateUser(patch) {
    set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user }));
  },

  async refreshProfile() {
    const res = await api.get('/users/me');
    set({ user: res.data.data });
    storage.saveUser(res.data.data);
  },
}));

export { getErrorMessage };
