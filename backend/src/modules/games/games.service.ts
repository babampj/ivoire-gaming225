import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';

export type GameInput = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  active?: boolean;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export async function listGames(includeInactive = false) {
  return prisma.game.findMany({
    where: includeInactive ? {} : { active: true },
    include: { _count: { select: { forums: true, voiceRooms: true, events: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getGame(slug: string) {
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { _count: { select: { forums: true, voiceRooms: true, events: true } } },
  });
  if (!game) throw errors.notFound('Jeu introuvable.');
  return game;
}

export async function createGame(input: GameInput) {
  const slug = slugify(input.slug || input.name);
  const exists = await prisma.game.findUnique({ where: { slug } });
  if (exists) throw errors.conflict('Un jeu avec ce slug existe déjà.');
  return prisma.game.create({
    data: { name: input.name, slug, description: input.description, image: input.image, icon: input.icon, active: input.active ?? true },
  });
}

export async function updateGame(id: string, input: Partial<GameInput>) {
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) throw errors.notFound('Jeu introuvable.');
  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.slug) data.slug = slugify(input.slug);
  if (input.description !== undefined) data.description = input.description;
  if (input.image !== undefined) data.image = input.image;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.active !== undefined) data.active = input.active;
  return prisma.game.update({ where: { id }, data });
}

export async function deleteGame(id: string) {
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) throw errors.notFound('Jeu introuvable.');
  await prisma.game.delete({ where: { id } });
  return { ok: true };
}

export async function eventsForGame(slug: string) {
  const game = await getGame(slug);
  const events = await prisma.event.findMany({
    where: { gameId: game.id, status: { not: 'CANCELLED' }, startDate: { gte: new Date() } },
    include: {
      organizer: { select: { id: true, username: true, avatar: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startDate: 'asc' },
  });
  return events;
}

export async function getChatHistory(slug: string, take = 50) {
  const game = await getGame(slug);
  return prisma.gameChatMessage.findMany({
    where: { gameId: game.id },
    include: {
      sender: { select: { id: true, username: true, avatar: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function popularDiscussionsByGame(slug: string, take = 3) {
  const game = await getGame(slug);
  const forums = await prisma.forum.findMany({
    where: { gameId: game.id, status: 'OPEN' },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
  // nombre de likes total par forum (via posts) — approximation du "populaire"
  return forums;
}

export async function onlinePlayersForGame(slug: string, take = 12) {
  const game = await getGame(slug);
  const rows = await prisma.userGame.findMany({
    where: {
      gameId: game.id,
      user: { status: 'ONLINE' },
    },
    include: {
      user: { select: { id: true, username: true, avatar: true, status: true, city: true } },
    },
    take,
    orderBy: { position: 'asc' },
  });
  return rows.map((r) => r.user);
}