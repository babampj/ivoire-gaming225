import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { REQUEST_STATUS } from '../../common/constants.js';
import { notify } from '../../lib/notify.js';

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { userId },
    include: {
      friend: {
        select: { id: true, username: true, avatar: true, bio: true, city: true, status: true, lastSeen: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => r.friend);
}

export async function listFriendRequests(userId: string) {
  const [received, sent] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: REQUEST_STATUS.PENDING },
      include: { sender: { select: { id: true, username: true, avatar: true, city: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: REQUEST_STATUS.PENDING },
      include: { receiver: { select: { id: true, username: true, avatar: true, city: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    received: received.map((r) => ({ id: r.id, user: r.sender, createdAt: r.createdAt })),
    sent: sent.map((r) => ({ id: r.id, user: r.receiver, createdAt: r.createdAt })),
  };
}

export async function sendFriendRequest(meId: string, otherId: string) {
  if (meId === otherId) throw errors.badRequest('Vous ne pouvez pas vous ajouter vous-même.');

  const [target, block, friendship, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: otherId }, include: { privacy: true } }),
    prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: meId, blockedId: otherId }, { blockerId: otherId, blockedId: meId }] },
    }),
    prisma.friendship.findUnique({
      where: { userId_friendId: { userId: meId, friendId: otherId } },
    }),
    prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: meId, receiverId: otherId },
          { senderId: otherId, receiverId: meId },
        ],
        status: REQUEST_STATUS.PENDING,
      },
    }),
  ]);

  if (!target) throw errors.notFound('Utilisateur introuvable.');
  if (friendship) throw errors.conflict('Vous êtes déjà amis.');
  if (existing) throw errors.conflict('Une demande d\'ami est déjà en attente.');
  if (block) throw errors.forbidden('Demande impossible.');

  const privacy = target.privacy;
  if (privacy && !privacy.allowFriendRequests) {
    throw errors.forbidden('Cet utilisateur ne reçoit pas de demandes d\'amis.');
  }

  const request = await prisma.friendRequest.create({
    data: { senderId: meId, receiverId: otherId, status: REQUEST_STATUS.PENDING },
  });
  const me = await prisma.user.findUnique({ where: { id: meId }, select: { username: true } });
  await notify({
    userId: otherId,
    type: 'FRIEND_REQUEST',
    content: `${me?.username ?? 'Un joueur'} t'a envoyé une demande d'ami.`,
    refType: 'user',
    refId: meId,
  });
  return request;
}

export async function respondToRequest(meId: string, requestId: string, accept: boolean) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request || request.receiverId !== meId) throw errors.notFound('Demande introuvable.');
  if (request.status !== REQUEST_STATUS.PENDING) throw errors.conflict('Demande déjà traitée.');

  const status = accept ? REQUEST_STATUS.ACCEPTED : REQUEST_STATUS.DECLINED;
  await prisma.friendRequest.update({ where: { id: requestId }, data: { status } });

  if (accept) {
    await prisma.$transaction([
      prisma.friendship.create({ data: { userId: meId, friendId: request.senderId } }),
      prisma.friendship.create({ data: { userId: request.senderId, friendId: meId } }),
    ]);
    const me = await prisma.user.findUnique({ where: { id: meId }, select: { username: true } });
    await notify({
      userId: request.senderId,
      type: 'FRIEND_ACCEPTED',
      content: `${me?.username ?? 'Un joueur'} a accepté votre demande d'ami. 🎉`,
      refType: 'user',
      refId: meId,
    });
  }
  return { ok: true };
}

export async function removeFriend(meId: string, otherId: string) {
  await prisma.$transaction([
    prisma.friendship.deleteMany({ where: { userId: meId, friendId: otherId } }),
    prisma.friendship.deleteMany({ where: { userId: otherId, friendId: meId } }),
  ]);
  return { ok: true };
}

export async function blockUser(meId: string, otherId: string) {
  if (meId === otherId) throw errors.badRequest('Impossible de se bloquer soi-même.');
  await prisma.$transaction([
    prisma.blockedUser.create({ data: { blockerId: meId, blockedId: otherId } }),
    prisma.friendship.deleteMany({ where: { userId: meId, friendId: otherId } }),
    prisma.friendship.deleteMany({ where: { userId: otherId, friendId: meId } }),
    prisma.friendRequest.deleteMany({
      where: { OR: [{ senderId: meId, receiverId: otherId }, { senderId: otherId, receiverId: meId }] },
    }),
  ]);
  return { ok: true };
}

export async function suggestions(userId: string, take = 20) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { city: true } });
  const friendRows = await prisma.friendship.findMany({ where: { userId }, select: { friendId: true } });
  const requestRows = await prisma.friendRequest.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }], status: REQUEST_STATUS.PENDING },
    select: { senderId: true, receiverId: true },
  });
  const blockRows = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });

  const excluded = new Set<string>([userId]);
  friendRows.forEach((r) => excluded.add(r.friendId));
  requestRows.forEach((r) => {
    excluded.add(r.senderId);
    excluded.add(r.receiverId);
  });
  blockRows.forEach((r) => {
    excluded.add(r.blockerId);
    excluded.add(r.blockedId);
  });

  const candidates = await prisma.user.findMany({
    where: { id: { notIn: [...excluded] }, banned: false },
    select: { id: true, username: true, avatar: true, bio: true, city: true, status: true, lastSeen: true, createdAt: true },
    take: 100,
  });

  // Priorité à la même ville, puis en ligne.
  const scored = candidates
    .map((u) => ({ u, score: (u.city === me?.city ? 2 : 0) + (u.status === 'ONLINE' ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((x) => x.u);
  return scored;
}

export async function isBlockedByEither(a: string, b: string): Promise<boolean> {
  const block = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return Boolean(block);
}