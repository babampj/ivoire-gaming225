'use client'
import axios, { AxiosError } from 'axios';
import type { ApiError } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 20000 });

export const KEYS = {
  ACCESS_TOKEN: 'ig_access',
  REFRESH_TOKEN: 'ig_refresh',
  USER: 'ig_user',
};

export const storage = {
  saveTokens(access: string, refresh: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
  },
  getTokens(): { access: string | null; refresh: string | null } {
    if (typeof window === 'undefined') return { access: null, refresh: null };
    return {
      access: localStorage.getItem(KEYS.ACCESS_TOKEN),
      refresh: localStorage.getItem(KEYS.REFRESH_TOKEN),
    };
  },
  saveUser(user: unknown) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  getUser<T>(): T | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
  },
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function hasTokens(): boolean {
  return Boolean(accessToken && refreshToken);
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await axios.post(
      `${API_URL}/api/auth/refresh`,
      { refreshToken },
      { timeout: 10000 },
    );
    const tokens = res.data?.data?.tokens;
    if (!tokens?.accessToken || !tokens?.refreshToken) return false;
    setTokens(tokens.accessToken, tokens.refreshToken);
    storage.saveTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && refreshToken) {
      original._retry = true;
      const ok = await refreshOnce();
      if (ok) return api(original);
    }
    return Promise.reject(error);
  },
);

/** Extrait un message d'erreur lisible depuis une erreur Axios/API. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.';
    if (!err.response) return 'Connexion impossible au serveur. Vérifiez votre réseau.';
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue.';
}
