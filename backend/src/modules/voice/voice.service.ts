import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { getIO } from '../../lib/socket.js';
import { notify } from '../../lib/notify.js';
import { livekitEnabled, livekitRoomName, createVoiceToken } from '../../lib/livekit.js';
import { isGameCommunityMember } from '../communities/communities.service.js';

export const MAX_ROOM_MEMBERS = 10;

const memberSelect = {
  select: {
    id: true,
    username: true,
    avatar: true,
    status: true,
    city: true,
  },
} as const;

function roomCard(room: any, meId: string, extra: Record<string, unknown> = {}) {
  const members = (room.members ?? []).map((m: any) => (m.user ? m.user : m));
  const isMember = members.some((u: any) => u.id === meId);
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    isPrivate: room.isPrivate,
    game: room.game
      ? { id: room.game.id, name: room.game.name, slug: room.game.slug, icon: room.game.icon }
      : null,
    owner: room.owner
      ? { id: room.owner.id, username: room.owner.username, avatar: room.owner.avatar }
      : null,
    members,
    memberCount: members.length,
    isOwner: room.ownerId === meId,
    isMember,
    canJoin: !room.isPrivate || isMember,
    isInvited: room.isInvited ?? false,
    createdAt: room.createdAt,
    ...extra,
  };
}

export async function listRooms(meId: string | undefined) {
  const [publicRooms, privateRooms] = await Promise.all([
    prisma.voiceRoom.findMany({
      where: { isPrivate: false },
      include: {
        game: { select: { id: true, name: true, slug: true, icon: true } },
        owner: { select: { id: true, username: true, avatar: true } },
        members: { include: { user: memberSelect }, orderBy: { joinedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    meId
      ? prisma.voiceRoom.findMany({
          where: {
            isPrivate: true,
            OR: [{ ownerId: meId }, { members: { some: { userId: meId } } }, { invites: { some: { userId: meId } } }],
          },
          include: {
            game: { select: { id: true, name: true, slug: true, icon: true } },
            owner: { select: { id: true, username: true, avatar: true } },
            members: { include: { user: memberSelect }, orderBy: { joinedAt: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ]);

  return [
    ...publicRooms.map((r) => roomCard(r, meId ?? '')),
    ...privateRooms.map((r) => roomCard(r, meId ?? '')),
  ];
}

export async function createRoom(
  meId: string,
  input: { name: string; description?: string; gameSlug?: string; isPrivate?: boolean },
) {
  let gameId: string | null = null;
  if (input.gameSlug) {
    const game = await prisma.game.findUnique({ where: { slug: input.gameSlug } });
    if (!game) throw errors.badRequest('Jeu introuvable.');
    gameId = game.id;

    // ⬤ Un salon public par jeu ne peut être créé que par un fan (membre communauté)
    if (!input.isPrivate) {
      const member = await isGameCommunityMember(game.id, meId);
      if (!member) {
        throw errors.forbidden('Ajoutez ce jeu à vos favoris pour créer un salon vocal public communautaire.');
      }
    }
  }

  const livekitRoom = livekitEnabled() ? livekitRoomName() : null;
  const room = await prisma.voiceRoom.create({
    data: {
      name: input.name.trim(),
      description: input.description,
      gameId,
      ownerId: meId,
      isPrivate: input.isPrivate ?? false,
      livekitRoom,
    },
  });

  await prisma.voiceRoomMember.create({ data: { roomId: room.id, userId: meId } });

  const rich = await prisma.voiceRoom.findUnique({
    where: { id: room.id },
    include: {
      game: { select: { id: true, name: true, slug: true, icon: true } },
      owner: { select: { id: true, username: true, avatar: true } },
      members: { include: { user: memberSelect }, orderBy: { joinedAt: 'asc' } },
    },
  });

  // token LiveKit pour le créateur
  const token = rich?.livekitRoom ? await createVoiceToken(meId, rich.livekitRoom, true) : null;

  return {
    room: roomCard({ ...rich, isInvited: false }, meId),
    livekit: room.livekitRoom ? { room: room.livekitRoom, token } : null,
  };
}

export async function getRoom(id: string, meId: string) {
  const room = await prisma.voiceRoom.findUnique({
    where: { id },
    include: {
      game: { select: { id: true, name: true, slug: true, icon: true } },
      owner: { select: { id: true, username: true, avatar: true } },
      members: { include: { user: memberSelect }, orderBy: { joinedAt: 'asc' } },
    },
  });
  if (!room) throw errors.notFound('Salon vocal introuvable.');

  const invite = room.isPrivate
    ? await prisma.voiceRoomInvite.findUnique({ where: { roomId_userId: { roomId: id, userId: meId } } })
    : null;

  const isMember = room.members.some((m) => m.userId === meId);
  const canJoin = !room.isPrivate || isMember || Boolean(invite);
  if (room.isPrivate && !canJoin) {
    throw errors.forbidden('Ce salon vocal est privé.');
  }

  return roomCard({ ...room, isInvited: Boolean(invite) }, meId);
}

async function broadcastRoomState(roomId: string) {
  const room = await prisma.voiceRoom.findUnique({
    where: { id: roomId },
    include: {
      game: { select: { id: true, name: true, slug: true, icon: true } },
      owner: { select: { id: true, username: true, avatar: true } },
      members: { include: { user: memberSelect }, orderBy: { joinedAt: 'asc' } },
    },
  });
  if (!room) return;
  const ownerId = room.ownerId;
  getIO().to(`voice:${roomId}`).emit('voice:state', roomCard(room, ownerId));
}

export async function joinRoom(meId: string, roomId: string) {
  const room = await prisma.voiceRoom.findUnique({
    where: { id: roomId },
    include: {
      members: true,
      invites: true,
      game: { select: { id: true, name: true, slug: true, icon: true } },
      owner: { select: { id: true, username: true, avatar: true } },
    },
  });
  if (!room) throw errors.notFound('Salon vocal introuvable.');

  const alreadyMember = room.members.some((m) => m.userId === meId);
  if (room.isPrivate && !alreadyMember && !room.invites.some((i) => i.userId === meId)) {
    throw errors.forbidden('Ce salon vocal est privé. Demandez une invitation.');
  }

  // ⬤ Règles des salons publics par jeu (communautés)
  if (room.gameId) {
    const isMember = await isGameCommunityMember(room.gameId, meId);
    if (!isMember) {
      throw errors.forbidden('Seuls les joueurs ayant ce jeu en favori peuvent rejoindre ce salon.');
    }
    if (!alreadyMember && room.members.length >= MAX_ROOM_MEMBERS && !room.isPrivate) {
      throw errors.badRequest(`Ce salon est plein (${MAX_ROOM_MEMBERS} personnes max).`);
    }
  }

  if (!alreadyMember) {
    await prisma.voiceRoomMember.create({ data: { roomId, userId: meId } });
    await prisma.voiceRoomInvite.deleteMany({ where: { roomId, userId: meId } });
  }

  await prisma.user.update({ where: { id: meId }, data: { status: 'ONLINE', lastSeen: new Date() } });

  // token LiveKit si actif
  const token = room.livekitRoom ? await createVoiceToken(meId, room.livekitRoom, room.ownerId === meId) : null;

  await broadcastRoomState(roomId);
  return {
    id: room.id,
    name: room.name,
    isPrivate: room.isPrivate,
    ownerId: room.ownerId,
    isOwner: room.ownerId === meId,
    livekit: room.livekitRoom ? { room: room.livekitRoom, token } : null,
  };
}

export async function leaveRoom(meId: string, roomId: string) {
  const deleted = await prisma.voiceRoomMember.deleteMany({ where: { roomId, userId: meId } });
  if (deleted.count > 0) await broadcastRoomState(roomId);
  return { ok: true };
}

export async function togglePrivate(meId: string, roomId: string, isPrivate: boolean) {
  const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
  if (!room) throw errors.notFound('Salon vocal introuvable.');
  if (room.ownerId !== meId) throw errors.forbidden('Seul le créateur peut gérer l\'accès au salon.');

  const updated = await prisma.voiceRoom.update({ where: { id: roomId }, data: { isPrivate } });
  await broadcastRoomState(roomId);
  return updated;
}

export async function inviteUser(meId: string, roomId: string, userId: string) {
  const room = await prisma.voiceRoom.findUnique({ where: { id: roomId }, include: { owner: { select: { username: true } } } });
  if (!room) throw errors.notFound('Salon vocal introuvable.');
  if (room.ownerId !== meId) throw errors.forbidden('Seul le créateur peut inviter.');

  await prisma.voiceRoomInvite.upsert({
    where: { roomId_userId: { roomId, userId } },
    update: {},
    create: { roomId, userId, invitedBy: meId },
  });
  await notify({
    userId,
    type: 'VOICE_INVITE',
    content: `Vous êtes invité(e) au salon vocal « ${room.name} ».`,
    refType: 'room',
    refId: roomId,
  });
  return { ok: true };
}

export async function kickUser(meId: string, roomId: string, userId: string) {
  const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
  if (!room) throw errors.notFound('Salon vocal introuvable.');
  if (room.ownerId !== meId) throw errors.forbidden('Seul le créateur peut expulser.');

  await prisma.voiceRoomMember.deleteMany({ where: { roomId, userId } });
  getIO().to(`user:${userId}`).emit('voice:kicked', { roomId, roomName: room.name });
  await broadcastRoomState(roomId);
  return { ok: true };
}

export async function deleteRoom(meId: string, roomId: string, role: string) {
  const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
  if (!room) throw errors.notFound('Salon vocal introuvable.');
  if (room.ownerId !== meId && !['MODERATOR', 'ADMIN'].includes(role)) throw errors.forbidden();

  await prisma.voiceRoom.delete({ where: { id: roomId } });
  getIO().to(`voice:${roomId}`).emit('voice:closed', { roomId });
  getIO().in(`voice:${roomId}`).socketsLeave(`voice:${roomId}`);
  return { ok: true };
}