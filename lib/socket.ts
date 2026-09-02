'use client'
import { io, Socket } from 'socket.io-client';
import { getAccessToken, API_URL } from './services';

let socket: Socket | null = null;

/** Connecte le socket. Les événements métier sont consommés par les écrans. */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;
  if (typeof window === 'undefined') return socket as unknown as Socket;
  socket = io(API_URL, {
    auth: { token: getAccessToken() },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// ── Rooms ────────────────────────────────────────────────────────────────
export function joinGameChat(gameSlug: string) {
  socket?.emit('game-chat:join', { gameSlug });
}
export function leaveGameChat(gameSlug: string) {
  socket?.emit('game-chat:leave', { gameSlug });
}

export function joinDm(otherUserId: string) {
  socket?.emit('dm:join', { otherUserId });
}
export function leaveDm(otherUserId: string) {
  socket?.emit('dm:leave', { otherUserId });
}

export function joinGroupChat(groupId: string) {
  socket?.emit('group-chat:join', { groupId });
}
export function leaveGroupChat(groupId: string) {
  socket?.emit('group-chat:leave', { groupId });
}

export function joinVoiceSocket(roomId: string) {
  socket?.emit('voice:join', { roomId });
}
export function leaveVoiceSocket(roomId: string) {
  socket?.emit('voice:leave', { roomId });
}

export function sendTyping(to: string) {
  socket?.emit('dm:typing', { to });
}

// ── Appels (signalling) ──────────────────────────────────────────────────
export function sendCallInvite(to: string, callId: string) {
  socket?.emit('call:invite', { to, callId });
}
export function sendCallAccept(to: string, callId: string) {
  socket?.emit('call:accept', { to, callId });
}
export function sendCallDecline(to: string, callId: string) {
  socket?.emit('call:decline', { to, callId });
}
export function sendCallEnd(to: string, callId: string) {
  socket?.emit('call:end', { to, callId });
}
