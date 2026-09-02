import argon2 from 'argon2';
import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { isCityValid } from '../../common/cities.js';
import { MAX_FAVORITE_GAMES, ROLES } from '../../common/constants.js';
import { env, isDev } from '../../config/env.js';
import {
  signAccessToken,
  hashToken,
  randomToken,
} from '../../lib/jwt.js';
import { getFavorites } from '../users/user.dto.js';
import { syncMembership } from '../communities/communities.service.js';

export type AuthResult = {
  user: unknown;
  tokens: { accessToken: string; refreshToken: string };
};

async function issueTokenPair(user: { id: string; role: string }): Promise<AuthResult['tokens']> {
  const accessToken = signAccessToken(user.id, user.role);
  const refresh = randomToken(48);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 86400000),
    },
  });
  return { accessToken, refreshToken: refresh };
}

async function userPayload(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw errors.notFound('Utilisateur introuvable');
  const favorites = await getFavorites(userId);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    city: user.city,
    status: user.status,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    favorites,
  };
}

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  city: string;
  birthDate?: string;
  gameSlugs?: string[];
};

export async function register(input: RegisterInput): Promise<AuthResult> {
  if (!isCityValid(input.city)) throw errors.badRequest('Ville ivoirienne invalide.');

  const usernameExists = await prisma.user.findUnique({ where: { username: input.username } });
  if (usernameExists) throw errors.conflict('Ce pseudo est déjà pris.');

  const email = input.email.toLowerCase();
  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists) throw errors.conflict('Un compte existe déjà avec cet email.');

  const passwordHash = await argon2.hash(input.password);

  const slugs = [...new Set(input.gameSlugs ?? [])];
  if (slugs.length > MAX_FAVORITE_GAMES) {
    throw errors.badRequest(`Tu peux sélectionner jusqu'à ${MAX_FAVORITE_GAMES} jeux favoris.`);
  }
  const games = await prisma.game.findMany({
    where: { slug: { in: slugs }, active: true },
    select: { id: true },
  });
  if (games.length !== slugs.length) throw errors.badRequest('Un ou plusieurs jeux sont introuvables.');

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username: input.username,
        email,
        passwordHash,
        city: input.city,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        role: ROLES.USER,
        status: 'ONLINE',
        privacy: { create: {} },
      },
    });
    if (games.length > 0) {
      await tx.userGame.createMany({
        data: games.map((g, position) => ({ userId: created.id, gameId: g.id, position })),
      });
    }
    return created;
  });

  // ⬤ Synchronisation communautés avec les favoris choisis à l'inscription
  if (games.length > 0) {
    await syncMembership(user.id, games.map((g) => g.id));
  }

  const tokens = await issueTokenPair(user);
  return { user: await userPayload(user.id), tokens };
}

export async function login(identifier: string, password: string): Promise<AuthResult> {
  const email = identifier.includes('@') ? identifier.toLowerCase() : undefined;
  const user = await prisma.user.findFirst({
    where: email ? { email } : { username: identifier },
  });
  if (!user) throw errors.unauthorized('Identifiants invalides.');

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw errors.unauthorized('Identifiants invalides.');

  if (user.banned) {
    if (user.banExpiresAt && user.banExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { banned: false, banReason: null, banExpiresAt: null },
      });
    } else {
      throw errors.forbidden('Votre compte est suspendu.');
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { status: 'ONLINE', lastSeen: new Date() } });
  const tokens = await issueTokenPair(user);
  return { user: await userPayload(user.id), tokens };
}

export async function refresh(refreshToken: string): Promise<AuthResult['tokens']> {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!row || row.revoked || row.expiresAt.getTime() < Date.now()) {
    throw errors.unauthorized('Session invalide ou expirée.');
  }
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw errors.unauthorized('Utilisateur introuvable.');

  await prisma.refreshToken.update({ where: { id: row.id }, data: { revoked: true } });
  return issueTokenPair(user);
}

export async function logout(refreshToken: string): Promise<void> {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (row && !row.revoked) {
    await prisma.refreshToken.update({ where: { id: row.id }, data: { revoked: true } });
  }
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Réponse identique que l'email existe ou non (évite l'énumération).
  if (!user) return { devResetToken: null };
  const token = randomToken(32);
  await prisma.resetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  // En prod : envoyer par email (service mail à brancher). En dev on le renvoie.
  return { devResetToken: isDev() ? token : null };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const row = await prisma.resetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.used || row.expiresAt.getTime() < Date.now()) {
    throw errors.badRequest('Token de réinitialisation invalide ou expiré.');
  }
  const passwordHash = await argon2.hash(newPassword);
  await prisma.$transaction([
    prisma.resetToken.update({ where: { id: row.id }, data: { used: true } }),
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: row.userId }, data: { revoked: true } }),
  ]);
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw errors.unauthorized();
  const valid = await argon2.verify(user.passwordHash, oldPassword);
  if (!valid) throw errors.badRequest('Mot de passe actuel incorrect.');
  const passwordHash = await argon2.hash(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ]);
}