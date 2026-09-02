import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { getIO } from '../../lib/socket.js';
import { notify } from '../../lib/notify.js';
import { isBlockedByEither } from '../friends/friends.service.js';

export function dmRoom(a: string, b: string): string {
  return `dm:${[a, b].sort().join('_')}`;
}

export async function listConversations(meId: string) {
  const msgs = await prisma.message.findMany({
    where: { OR: [{ senderId: meId }, { receiverId: meId }] },
    orderBy: { createdAt: 'desc' },
    take: 400,
    include: {
      sender: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } },
      receiver: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } },
    },
  });

  const map = new Map<
    string,
    { user: typeof msgs[number]['sender']; lastMessage: typeof msgs[number]; unread: number }
  >();

  // orderé du plus récent au plus ancien → première occurrence = dernier message
  for (const m of msgs) {
    const other = m.senderId === meId ? m.receiver : m.sender;
    const entry = map.get(other.id);
    if (entry) {
      if (m.senderId !== meId && !m.readAt && m.receiverId === meId) entry.unread += 1;
    } else {
      map.set(other.id, {
        user: other,
        lastMessage: m,
        unread: m.senderId !== meId && !m.readAt ? 1 : 0,
      });
    }
  }

  // exclure les conversations avec des utilisateurs bloqués
  const blocks = await prisma.blockedUser.findMany({ where: { blockerId: meId } });
  blocks.forEach((b) => map.delete(b.blockedId));

  return [...map.values()].map((e) => ({
    user: e.user,
    lastMessage: {
      id: e.lastMessage.id,
      content: e.lastMessage.content,
      type: e.lastMessage.type,
      createdAt: e.lastMessage.createdAt,
      fromMe: e.lastMessage.senderId === meId,
      read: Boolean(e.lastMessage.readAt),
    },
    unread: e.unread,
  }));
}

export async function getConversation(meId: string, otherId: string, page = 1, limit = 50) {
  if (await isBlockedByEither(meId, otherId)) {
    throw errors.forbidden('Conversation indisponible.');
  }
  const skip = Math.max(0, (page - 1) * limit);
  const [total, messages] = await Promise.all([
    prisma.message.count({
      where: { OR: [{ senderId: meId, receiverId: otherId }, { senderId: otherId, receiverId: meId }] },
    }),
    prisma.message.findMany({
      where: { OR: [{ senderId: meId, receiverId: otherId }, { senderId: otherId, receiverId: meId }] },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    }),
  ]);
  return { total, page, items: messages };
}

export async function sendMessage(meId: string, otherId: string, content: string) {
  if (meId === otherId) throw errors.badRequest('Impossible de s\'envoyer un message à soi-même.');
  if (content.length > 1000) throw errors.badRequest('Message trop long.');

  const target = await prisma.user.findUnique({ where: { id: otherId }, include: { privacy: true } });
  if (!target) throw errors.notFound('Utilisateur introuvable.');
  if (await isBlockedByEither(meId, otherId)) throw errors.forbidden('Message non autorisé.');

  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: meId, friendId: otherId } },
  });
  if (!friendship) throw errors.forbidden('Vous devez être amis pour discuter en privé.');

  if (target.privacy && !target.privacy.allowDirectMessages) {
    throw errors.forbidden('Cet utilisateur n\'accepte pas les messages privés.');
  }

  const message = await prisma.message.create({
    data: { senderId: meId, receiverId: otherId, content },
    include: { sender: { select: { id: true, username: true, avatar: true, status: true } } },
  });

  const room = dmRoom(meId, otherId);
  getIO().to(room).emit('dm:message', message);
  getIO().to(`user:${otherId}`).emit('dm:new', {
    message,
    preview: content,
  });

  await notify({
    userId: otherId,
    type: 'NEW_MESSAGE',
    content: `${message.sender.username}: ${content}`,
    refType: 'message',
    refId: message.id,
  });

  return message;
}

export async function markRead(meId: string, otherId: string) {
  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: meId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function deleteConversation(meId: string, otherId: string) {
  // MVP : supprime l'échange entre les deux utilisateurs.
  await prisma.message.deleteMany({
    where: { OR: [{ senderId: meId, receiverId: otherId }, { senderId: otherId, receiverId: meId }] },
  });
  return { ok: true };
}