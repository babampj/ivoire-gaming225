import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';

const gameSelect = { select: { id: true, name: true, slug: true, icon: true } } as const;

/** S'assure qu'une communauté existe pour un jeu (créée à la demande). */
export async function ensureCommunity(gameId: string) {
  const existing = await prisma.gameCommunity.findUnique({ where: { gameId } });
  if (existing) return existing;
  return prisma.gameCommunity.create({ data: { gameId } });
}

function communityCard(c: any) {
  return {
    id: c.id,
    game: c.game
      ? { id: c.game.id, name: c.game.name, slug: c.game.slug, icon: c.game.icon }
      : null,
    name: c.name ?? c.game?.name ?? 'Communauté',
    membersCount: Array.isArray(c.members) ? c.members.length : c._count?.members ?? 0,
    createdAt: c.createdAt,
  };
}

/** Top communautés par nombre de membres (pour l'accueil). */
export async function topCommunities(limit = 3) {
  const rows = await prisma.gameCommunity.findMany({
    include: {
      game: gameSelect,
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { members: { _count: 'desc' } },
    take: limit,
  });
  return rows.map(communityCard);
}

/** Communités auxquelles l'utilisateur appartient (via ses favoris). */
export async function myCommunities(userId: string) {
  const rows = await prisma.gameCommunity.findMany({
    where: { members: { some: { userId } } },
    include: {
      game: gameSelect,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(communityCard);
}

/** Détail d'une communauté d'un jeu, avec ses membres en ligne/récents. */
export async function getCommunityForGame(slug: string, meId?: string) {
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { communities: { include: { members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, city: true } } } } } } },
  });
  if (!game) throw errors.notFound('Jeu introuvable.');
  await ensureCommunity(game.id);

  const community = await prisma.gameCommunity.findUnique({
    where: { gameId: game.id },
    include: {
      game: gameSelect,
      members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, city: true } } } },
    },
  });
  if (!community) throw errors.notFound('Communauté introuvable.');

  const members = community.members.map((m) => m.user);
  const isMember = meId ? members.some((u: any) => u.id === meId) : false;

  return {
    id: community.id,
    game: community.game,
    name: community.name ?? game.name,
    isMember,
    membersCount: members.length,
    members: members.slice(0, 50),
  };
}

/** Vrai si l'utilisateur est membre de la communauté du jeu (jeu favori). */
export async function isGameCommunityMember(gameId: string, userId: string) {
  const community = await prisma.gameCommunity.findUnique({
    where: { gameId },
    select: { members: { where: { userId }, select: { userId: true } } },
  });
  return Boolean(community && community.members.length > 0);
}

/** Synchronise l'adhésion selon les favoris (appelé à chaque maj des favoris). */
export async function syncMembership(userId: string, favoriteGameIds: string[]) {
  await prisma.$transaction(async (tx) => {
    // 1) Quitter toutes les communautés sauf celles des jeux favoris
    await tx.gameCommunityMember.deleteMany({
      where: { userId, community: { gameId: { notIn: favoriteGameIds } } },
    });

    // 2) Rejoindre les communautés des jeux favoris
    if (favoriteGameIds.length > 0) {
      for (const gameId of favoriteGameIds) {
        const community = await tx.gameCommunity.upsert({
          where: { gameId },
          update: {},
          create: { gameId },
        });
        await tx.gameCommunityMember.upsert({
          where: { communityId_userId: { communityId: community.id, userId } },
          update: {},
          create: { communityId: community.id, userId },
        });
      }
    }
  });
}
