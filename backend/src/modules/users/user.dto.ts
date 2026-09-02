import type { User } from '@prisma/client';
import prisma from '../../lib/prisma.js';

export interface UserCard {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  status: string;
  lastSeen: Date | null;
  createdAt: Date;
}

export interface GameSummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
}

export type Relation =
  | 'self'
  | 'friend'
  | 'requestSent'
  | 'requestReceived'
  | 'none'
  | 'blocked';

export interface RelationInfo {
  relation: Relation;
  friendRequestId: string | null;
}

const pickUser = {
  id: true,
  username: true,
  avatar: true,
  bio: true,
  city: true,
  status: true,
  lastSeen: true,
  createdAt: true,
} as const;

export function toUserCard(u: Pick<User, keyof typeof pickUser> | null): UserCard | null {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    bio: u.bio,
    city: u.city,
    status: u.status,
    lastSeen: u.lastSeen,
    createdAt: u.createdAt,
  };
}

/** Statut de relation entre deux utilisateurs (appelé fréquemment). */
export async function relationBetween(meId: string, otherId: string): Promise<RelationInfo> {
  if (meId === otherId) return { relation: 'self', friendRequestId: null };

  const [block, friend, received, sent] = await Promise.all([
    prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: otherId } },
    }),
    prisma.friendship.findUnique({
      where: { userId_friendId: { userId: meId, friendId: otherId } },
    }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: otherId, receiverId: meId } },
    }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: meId, receiverId: otherId } },
    }),
  ]);

  if (block) return { relation: 'blocked', friendRequestId: null };
  if (friend) return { relation: 'friend', friendRequestId: friend.id };
  if (received) return { relation: 'requestReceived', friendRequestId: received.id };
  if (sent) return { relation: 'requestSent', friendRequestId: sent.id };
  return { relation: 'none', friendRequestId: null };
}

export function getGamesOf(userIds: string[], meId?: string) {
  return prisma.userGame.findMany({
    where: meId ? { userId: meId } : { userId: { in: userIds } },
    include: { game: { select: { id: true, name: true, slug: true, icon: true } } },
    orderBy: { position: 'asc' },
  });
}

export async function getFavorites(meId: string): Promise<GameSummary[]> {
  const rows = await prisma.userGame.findMany({
    where: { userId: meId },
    include: { game: { select: { id: true, name: true, slug: true, icon: true } } },
    orderBy: { position: 'asc' },
  });
  return rows.map((r) => ({
    id: r.gameId,
    name: r.game.name,
    slug: r.game.slug,
    icon: r.game.icon,
    position: r.position,
  }));
}