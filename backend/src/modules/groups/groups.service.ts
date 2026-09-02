import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { getIO } from '../../lib/socket.js';
import { notify } from '../../lib/notify.js';

const memberCard = {
  select: { id: true, username: true, avatar: true, status: true, city: true },
} as const;

export async function myGroups(userId: string) {
  const rows = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          owner: memberCard,
          _count: { select: { members: true, messages: true } },
        },
      },
    },
    orderBy: { group: { createdAt: 'desc' } },
  });
  return rows.map((r) => ({
    id: r.group.id,
    name: r.group.name,
    description: r.group.description,
    avatar: r.group.avatar,
    isTeam: r.group.isTeam,
    createdAt: r.group.createdAt,
    owner: r.group.owner,
    memberCount: r.group._count.members,
    messagesCount: r.group._count.messages,
    myRole: r.role,
  }));
}

export async function getGroup(id: string, meId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: meId } },
  });
  if (!membership) throw errors.forbidden('Vous n\'êtes pas membre de ce groupe.');

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: memberCard,
      members: {
        include: { user: memberCard },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { messages: true } },
    },
  });
  if (!group) throw errors.notFound('Groupe introuvable.');

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    avatar: group.avatar,
    isTeam: group.isTeam,
    createdAt: group.createdAt,
    owner: group.owner,
    members: group.members.map((m) => ({ ...m.user, roleInGroup: m.role })),
    messagesCount: group._count.messages,
    myRole: membership.role,
  };
}

export async function createGroup(
  meId: string,
  input: { name: string; description?: string; isTeam?: boolean; friendIds?: string[] },
) {
  const friends = input.friendIds ? [...new Set(input.friendIds)] : [];

  // seuls des AMIS peuvent être ajoutés directement.
  if (friends.length > 0) {
    const ok = await prisma.friendship.count({
      where: { userId: meId, friendId: { in: friends } },
    });
    if (ok !== friends.length) throw errors.badRequest('Vous ne pouvez inviter que vos amis.');
  }

  const group = await prisma.$transaction(async (tx) => {
    const g = await tx.group.create({
      data: {
        name: input.name.trim(),
        description: input.description,
        isTeam: input.isTeam ?? false,
        ownerId: meId,
      },
    });
    await tx.groupMember.create({ data: { groupId: g.id, userId: meId, role: 'OWNER' } });
    if (friends.length > 0) {
      await tx.groupMember.createMany({
        data: friends.map((f) => ({ groupId: g.id, userId: f, role: 'MEMBER' })),
      });
    }
    return g;
  });

  for (const f of friends) {
    await notify({
      userId: f,
      type: 'GROUP_INVITE',
      content: `Vous avez rejoint le groupe « ${input.name} ».`,
      refType: 'group',
      refId: group.id,
    });
  }

  return group;
}

export async function updateGroup(id: string, meId: string, role: string, input: { name?: string; description?: string; avatar?: string; mainGameSlug?: string }) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw errors.notFound('Groupe introuvable.');
  if (group.ownerId !== meId && role !== 'ADMIN') throw errors.forbidden();

  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.avatar !== undefined) data.avatar = input.avatar;
  if (input.mainGameSlug !== undefined) {
    // réservé à la future transformation en team esport
    const game = await prisma.game.findUnique({ where: { slug: input.mainGameSlug } });
    data.mainGameId = game?.id ?? null;
  }
  return prisma.group.update({ where: { id }, data });
}

export async function deleteGroup(id: string, meId: string, role: string) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw errors.notFound('Groupe introuvable.');
  if (group.ownerId !== meId && role !== 'ADMIN') throw errors.forbidden();
  await prisma.group.delete({ where: { id } });
  return { ok: true };
}

export async function inviteFriends(meId: string, id: string, friendId: string) {
  const group = await prisma.group.findUnique({ where: { id }, include: { owner: { select: { username: true } } } });
  if (!group) throw errors.notFound('Groupe introuvable.');
  if (group.ownerId !== meId) throw errors.forbidden('Seul le créateur peut inviter.');

  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: meId, friendId } },
  });
  if (!friendship) throw errors.badRequest('Ce joueur doit être votre ami.');

  const membership = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: id, userId: friendId } },
    update: {},
    create: { groupId: id, userId: friendId, role: 'MEMBER' },
  });
  await notify({
    userId: friendId,
    type: 'GROUP_INVITE',
    content: `${group.owner.username} vous a ajouté au groupe « ${group.name} ».`,
    refType: 'group',
    refId: id,
  });
  return membership;
}

export async function leaveGroup(meId: string, id: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: meId } },
  });
  if (!membership) throw errors.forbidden('Vous n\'êtes pas membre.');
  if (membership.role === 'OWNER') {
    const count = await prisma.groupMember.count({ where: { groupId: id } });
    if (count === 1) {
      await prisma.group.delete({ where: { id } });
      return { ok: true, deleted: true };
    }
    // transfère la propriété au premier ADMIN ou MEMBER restant
    const next = await prisma.groupMember.findFirst({
      where: { groupId: id, NOT: { userId: meId } },
      orderBy: { joinedAt: 'asc' },
    });
    if (next) {
      await prisma.groupMember.update({
        where: { groupId_userId: { groupId: id, userId: next.userId } },
        data: { role: 'OWNER' },
      });
    }
  }
  await prisma.groupMember.delete({ where: { groupId_userId: { groupId: id, userId: meId } } });
  return { ok: true, deleted: false };
}

export async function kickMember(meId: string, id: string, userId: string) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw errors.notFound('Groupe introuvable.');

  const me = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: meId } },
  });
  if (!me || !['OWNER', 'ADMIN'].includes(me.role)) throw errors.forbidden();

  if (userId === group.ownerId) throw errors.badRequest('Impossible d\'expulser le créateur.');
  await prisma.groupMember.deleteMany({ where: { groupId: id, userId } });
  return { ok: true };
}

export async function getMessages(groupId: string, meId: string, page = 1, limit = 50) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: groupId, userId: meId } },
  });
  if (!membership) throw errors.forbidden('Vous n\'êtes pas membre.');
  const skip = Math.max(0, (page - 1) * limit);
  const [total, messages] = await Promise.all([
    prisma.groupMessage.count({ where: { groupId } }),
    prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: { sender: { select: { id: true, username: true, avatar: true, status: true } } },
    }),
  ]);
  return { total, page, items: messages };
}

export async function sendMessage(meId: string, groupId: string, content: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: groupId, userId: meId } },
  });
  if (!membership) throw errors.forbidden('Vous n\'êtes pas membre de ce groupe.');
  if (content.trim().length === 0) throw errors.badRequest('Message vide.');

  const msg = await prisma.groupMessage.create({
    data: { groupId, senderId: meId, content: content.trim() },
    include: { sender: { select: { id: true, username: true, avatar: true, status: true } } },
  });
  getIO().to(`group:${groupId}`).emit('group-chat:new', msg);
  return msg;
}