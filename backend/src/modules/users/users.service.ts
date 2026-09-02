import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { MAX_FAVORITE_GAMES } from '../../common/constants.js';
import { isCityValid } from '../../common/cities.js';
import { getFavorites, relationBetween } from './user.dto.js';
import { syncMembership } from '../communities/communities.service.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { privacy: true },
  });
  if (!user) throw errors.notFound('Utilisateur introuvable');

  const [favorites, friendsCount, groupsCount] = await Promise.all([
    getFavorites(userId),
    prisma.friendship.count({ where: { userId } }),
    prisma.group.count({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    }),
  ]);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    city: user.city,
    birthDate: user.birthDate,
    status: user.status,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    favorites,
    friendsCount,
    groupsCount,
    privacy: user.privacy,
  };
}

export async function getProfile(userId: string, meId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw errors.notFound('Utilisateur introuvable');

  const favorites = await getFavorites(userId);
  const [friendsCount, relation] = await Promise.all([
    prisma.friendship.count({ where: { userId } }),
    meId ? relationBetween(meId, userId) : Promise.resolve(null),
  ]);

  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    city: user.city,
    status: user.status,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    favorites,
    friendsCount,
    relation,
  };
}

export type UpdateProfileInput = {
  username?: string;
  bio?: string;
  city?: string;
  birthDate?: string | null;
};

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const data: Record<string, unknown> = {};

  if (input.username !== undefined) {
    if (input.username.length < 3 || input.username.length > 24) {
      throw errors.badRequest('Le pseudo doit contenir entre 3 et 24 caractères.');
    }
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing && existing.id !== userId) throw errors.conflict('Ce pseudo est déjà pris.');
    data.username = input.username;
  }
  if (input.bio !== undefined) {
    if (input.bio.length > 200) throw errors.badRequest('La bio ne peut pas dépasser 200 caractères.');
    data.bio = input.bio;
  }
  if (input.city !== undefined) {
    if (!isCityValid(input.city)) throw errors.badRequest('Ville invalide.');
    data.city = input.city;
  }
  if (input.birthDate !== undefined) {
    data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  return user;
}

/** Met à jour les jeux favoris avec validation stricte : maximum 3. */
export async function setFavorites(userId: string, gameIds: string[]) {
  const unique = [...new Set(gameIds)];
  if (unique.length > MAX_FAVORITE_GAMES) {
    throw errors.badRequest(`Tu peux sélectionner jusqu'à ${MAX_FAVORITE_GAMES} jeux favoris.`);
  }
  const games = await prisma.game.findMany({
    where: { id: { in: unique }, active: true },
    select: { id: true },
  });
  if (games.length !== unique.length) {
    throw errors.badRequest('Un ou plusieurs jeux sont introuvables.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.userGame.deleteMany({ where: { userId } });
    if (unique.length > 0) {
      await tx.userGame.createMany({
        data: unique.map((gameId, position) => ({ userId, gameId, position })),
      });
    }
  });
}

export async function setFavoritesBySlugs(userId: string, slugs: string[]) {
  const unique = [...new Set(slugs)];
  if (unique.length > MAX_FAVORITE_GAMES) {
    throw errors.badRequest(`Tu peux sélectionner jusqu'à ${MAX_FAVORITE_GAMES} jeux favoris.`);
  }
  const games = await prisma.game.findMany({
    where: { slug: { in: unique }, active: true },
    select: { id: true },
  });
  if (games.length !== unique.length) {
    throw errors.badRequest('Un ou plusieurs jeux sont introuvables.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.userGame.deleteMany({ where: { userId } });
    if (games.length > 0) {
      await tx.userGame.createMany({
        data: games.map((g, position) => ({ userId, gameId: g.id, position })),
      });
    }
  });

  // ⬤ Synchronisation automatique des communautés avec les favoris
  await syncMembership(userId, games.map((g) => g.id));
}

export async function updatePrivacy(
  userId: string,
  input: { showOnline?: boolean; allowFriendRequests?: boolean; allowDirectMessages?: boolean; notificationsEnabled?: boolean },
) {
  return prisma.userPrivacy.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
}

export async function setAvatar(userId: string, url: string) {
  return prisma.user.update({ where: { id: userId }, data: { avatar: url } });
}