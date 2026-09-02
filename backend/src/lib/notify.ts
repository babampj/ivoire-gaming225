import prisma from './prisma.js';
import { getIO } from './socket.js';
import { env } from '../config/env.js';

export type NotifyPayload = {
  userId: string;
  type: string;
  content: string;
  refType?: string | null;
  refId?: string | null;
};

/**
 * Crée une notification en base, l'envoie en temps réel (socket) et,
 * si activé, déclenche une push notification via le fournisseur Expo/FCM.
 * Respecte les préférences de confidentialité de l'utilisateur.
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const privacy = await prisma.userPrivacy.findUnique({ where: { userId: payload.userId } });
  if (privacy && !privacy.notificationsEnabled) return;

  const notif = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      content: payload.content,
      refType: payload.refType,
      refId: payload.refId,
    },
  });

  getIO().to(`user:${payload.userId}`).emit('notification:new', {
    id: notif.id,
    type: notif.type,
    content: notif.content,
    refType: notif.refType,
    refId: notif.refId,
    read: false,
    createdAt: notif.createdAt,
  });

  if (env.expoPushEnabled) {
    await deliverPush(payload.userId, payload.content).catch(() => undefined);
  }
}

async function deliverPush(userId: string, body: string): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return;
  // Interface fournisseur : Expo Push API (ou FCM). Remplacer le client HTTP au besoin.
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: tokens.map((t) => t.token),
      title: 'Ivoire Gaming',
      body,
      sound: 'default',
      badge: 1,
    }),
  });
  if (!res.ok) throw new Error(`Push failed ${res.status}`);
}