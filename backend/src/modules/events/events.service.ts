import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';

export type EventInput = {
  title: string;
  description?: string;
  image?: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  link?: string;
  gameSlug?: string;
};

export async function listEvents(filters: { gameSlug?: string; city?: string }, status = 'UPCOMING') {
  const where: Record<string, unknown> = { startDate: { gte: new Date() } };
  if (status === 'ALL') {
    delete where.startDate;
  } else {
    where.status = status;
  }
  if (filters.gameSlug) {
    const game = await prisma.game.findUnique({ where: { slug: filters.gameSlug } });
    if (game) where.gameId = game.id;
  }
  if (filters.city) where.location = filters.city;

  const events = await prisma.event.findMany({
    where,
    include: {
      organizer: { select: { id: true, username: true, avatar: true } },
      game: { select: { id: true, name: true, slug: true, icon: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startDate: 'asc' },
  });
  return events;
}

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, username: true, avatar: true, city: true } },
      game: { select: { id: true, name: true, slug: true, icon: true } },
      participants: {
        include: { user: { select: { id: true, username: true, avatar: true, city: true, status: true } } },
      },
    },
  });
  if (!event) throw errors.notFound('Événement introuvable.');
  return event;
}

export async function resolveGameId(gameSlug?: string): Promise<string | null> {
  if (!gameSlug) return null;
  const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
  if (!game) throw errors.badRequest('Jeu introuvable.');
  return game.id;
}

export async function createEvent(userId: string, input: EventInput) {
  const gameId = await resolveGameId(input.gameSlug);
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      image: input.image,
      location: input.location,
      address: input.address,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      link: input.link,
      gameId,
      organizerId: userId,
    },
  });
}

export async function updateEvent(id: string, userId: string, role: string, input: Partial<EventInput>) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw errors.notFound('Événement introuvable.');
  if (event.organizerId !== userId && !['MODERATOR', 'ADMIN'].includes(role)) {
    throw errors.forbidden();
  }
  const data: Record<string, unknown> = {};
  if (input.title) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.image !== undefined) data.image = input.image;
  if (input.location) data.location = input.location;
  if (input.address !== undefined) data.address = input.address;
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
  if (input.link !== undefined) data.link = input.link;
  if (input.gameSlug !== undefined) {
    const gameId = await resolveGameId(input.gameSlug);
    data.gameId = gameId;
  }
  return prisma.event.update({ where: { id }, data });
}

export async function deleteEvent(id: string, userId: string, role: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw errors.notFound('Événement introuvable.');
  if (event.organizerId !== userId && !['MODERATOR', 'ADMIN'].includes(role)) {
    throw errors.forbidden();
  }
  await prisma.event.delete({ where: { id } });
  return { ok: true };
}

export async function participate(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw errors.notFound('Événement introuvable.');
  await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: {},
    create: { eventId, userId },
  });
  return { ok: true };
}

export async function leave(eventId: string, userId: string) {
  await prisma.eventParticipant.deleteMany({ where: { eventId, userId } });
  return { ok: true };
}

export async function myEvents(userId: string) {
  const rows = await prisma.eventParticipant.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          game: { select: { id: true, name: true, slug: true, icon: true } },
          organizer: { select: { id: true, username: true, avatar: true } },
          _count: { select: { participants: true } },
        },
      },
    },
    orderBy: { event: { startDate: 'asc' } },
  });
  return rows.map((r) => r.event);
}