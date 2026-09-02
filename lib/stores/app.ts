'use client'
import { create } from 'zustand';

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
}

export type ActiveCall =
  | { mode: 'incoming'; callId: string; peerId: string; peerName: string }
  | { mode: 'outgoing'; callId: string; peerId: string; peerName: string };

export interface ActiveVoice {
  roomId: string;
  name: string;
  livekit: { room: string; token: string } | null;
}

interface AppState {
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
  activeCall: ActiveCall | null;
  setActiveCall: (c: ActiveCall | null) => void;
  activeVoice: ActiveVoice | null;
  setActiveVoice: (v: ActiveVoice | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

export const useApp = create<AppState>((set) => ({
  unreadNotifications: 0,
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  activeCall: null,
  setActiveCall: (c) => set({ activeCall: c }),
  activeVoice: null,
  setActiveVoice: (v) => set({ activeVoice: v }),
  toast: null,
  showToast: (msg) => set({ toast: msg }),
  dismissToast: () => set({ toast: null }),
}));
