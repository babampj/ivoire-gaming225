import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';
import { dmRoom } from '../modules/messages/messages.service.js';

/** Compteur de sockets par utilisateur (présence multi-appareils). */
const socketCounts = new Map<string, number>();

function increment(userId: string) {
  socketCounts.set(userId, (socketCounts.get(userId) ?? 0) + 1);
}

function decrement(userId: string) {
  const next = (socketCounts.get(userId) ?? 1) - 1;
  if (next <= 0) {
    socketCounts.delete(userId);
    return 0;
  }
  socketCounts.set(userId, next);
  return next;
}

export function initRealtime(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('token manquant'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('session invalide'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    increment(userId);

    // room personnelle : notifications, dm entrants, appels…
    socket.join(`user:${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ONLINE', lastSeen: new Date() },
    });
    socket.broadcast.emit('presence:change', { userId, status: 'ONLINE' });

    // infos légères pour le signalling d'appel
    const me = await prisma.user
      .findUnique({ where: { id: userId }, select: { username: true } })
      .catch(() => null);
    if (me) socket.data.username = me.username;
    const { livekitEnabled } = await import('../lib/livekit.js');
    socket.data.livekitEnabled = livekitEnabled();

    // rejoindre d'office les salles vocales où l'on est membre
    try {
      const memberships = await prisma.voiceRoomMember.findMany({
        where: { userId },
        select: { roomId: true },
      });
      memberships.forEach((m) => socket.join(`voice:${m.roomId}`));
    } catch {
      // base indisponible → on continue
    }

    // ── Rejoindre/quitter les rooms de chat ──────────────────────────
    socket.on('game-chat:join', (payload: { gameSlug: string }) => {
      if (payload?.gameSlug) socket.join(`game:${payload.gameSlug}`);
    });
    socket.on('game-chat:leave', (payload: { gameSlug: string }) => {
      if (payload?.gameSlug) socket.leave(`game:${payload.gameSlug}`);
    });

    socket.on('dm:join', (payload: { otherUserId: string }) => {
      if (payload?.otherUserId) socket.join(dmRoom(userId, payload.otherUserId));
    });
    socket.on('dm:leave', (payload: { otherUserId: string }) => {
      if (payload?.otherUserId) socket.leave(dmRoom(userId, payload.otherUserId));
    });

    socket.on('group-chat:join', (payload: { groupId: string }) => {
      if (payload?.groupId) socket.join(`group:${payload.groupId}`);
    });
    socket.on('group-chat:leave', (payload: { groupId: string }) => {
      if (payload?.groupId) socket.leave(`group:${payload.groupId}`);
    });

    socket.on('forum:join', (payload: { forumId: string }) => {
      if (payload?.forumId) socket.join(`forum:${payload.forumId}`);
    });
    socket.on('forum:leave', (payload: { forumId: string }) => {
      if (payload?.forumId) socket.leave(`forum:${payload.forumId}`);
    });

    socket.on('voice:join', (payload: { roomId: string }) => {
      if (payload?.roomId) socket.join(`voice:${payload.roomId}`);
    });
    socket.on('voice:leave', (payload: { roomId: string }) => {
      if (payload?.roomId) socket.leave(`voice:${payload.roomId}`);
    });

    // ── Typing (indicateur de saisie) ────────────────────────────────
    socket.on('dm:typing', (payload: { to: string }) => {
      if (payload?.to) {
        io.to(`user:${payload.to}`).emit('dm:typing', { from: userId });
      }
    });

    // ── Appels (signalling) — les médias passent par LiveKit ─────────
    socket.on('call:invite', (payload: { to: string; callId?: string }) => {
      if (!payload?.to) return;
      const fromName: string = socket.data.username ?? '';
      io.to(`user:${payload.to}`).emit('call:incoming', {
        callId: payload.callId ?? `${userId}_${Date.now()}`,
        from: userId,
        fromName,
        livekitEnabled: Boolean(socket.data.livekitEnabled),
      });
    });

    socket.on('call:accept', (payload: { to: string; callId: string }) => {
      if (payload?.to) io.to(`user:${payload.to}`).emit('call:accepted', { callId: payload.callId, from: userId });
    });

    socket.on('call:decline', (payload: { to: string; callId: string }) => {
      if (payload?.to) io.to(`user:${payload.to}`).emit('call:declined', { callId: payload.callId, from: userId });
    });

    socket.on('call:end', (payload: { to: string; callId: string }) => {
      if (payload?.to) io.to(`user:${payload.to}`).emit('call:ended', { callId: payload.callId, from: userId });
    });

    socket.on('call:sdp', (payload: { to: string; description: unknown }) => {
      if (payload?.to) io.to(`user:${payload.to}`).emit('call:sdp', { from: userId, description: payload.description });
    });

    // ── Déconnexion ──────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      socket.leave(`user:${userId}`);
      const remaining = decrement(userId);
      if (remaining === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE', lastSeen: new Date() },
        });
        io.emit('presence:change', { userId, status: 'OFFLINE' });
      }
    });
  });

  console.log('⚡ Socket.IO initialisé');
}