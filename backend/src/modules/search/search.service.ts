import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';

/**
 * Recherche globale : joueurs, jeux, discussions, événements, groupes.
 * Petites listes (top 5 par catégorie) pour une réponse rapide sur mobile.
 */
export async function globalSearch(q: string) {
  const term = q.trim();
  if (!term) throw errors.badRequest('Terme de recherche requis.');
  if (term.length < 2) throw errors.badRequest('Recherche trop courte (2 caractères minimum).');

  const [users, games, forums, events, groups] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ username: { contains: term } }, { city: { contains: term } }], banned: false },
      select: { id: true, username: true, avatar: true, bio: true, city: true, status: true, lastSeen: true, createdAt: true },
      take: 5,
    }),
    prisma.game.findMany({
      where: { active: true, OR: [{ name: { contains: term } }, { description: { contains: term } }] },
      take: 5,
    }),
    prisma.forum.findMany({
      where: { title: { contains: term }, status: 'OPEN' },
      include: {
        game: { select: { id: true, name: true, slug: true, icon: true } },
        author: { select: { id: true, username: true, avatar: true } },
      },
      take: 5,
    }),
    prisma.event.findMany({
      where: { title: { contains: term }, status: { not: 'CANCELLED' } },
      include: {
        game: { select: { id: true, name: true, slug: true, icon: true } },
        organizer: { select: { id: true, username: true, avatar: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.group.findMany({
      where: { name: { contains: term } },
      include: { owner: { select: { id: true, username: true, avatar: true } } },
      take: 5,
    }),
  ]);

  return { users, games, forums, events, groups };
}