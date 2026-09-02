import express from 'express';
import cors from 'cors';
import { env, isDev } from './config/env.js';
import { uploadsDir } from './middleware/upload.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { requireOptionalAuth } from './middleware/auth.js';
import { errors } from './common/ApiError.js';

import authRoutes from './modules/auth/routes.js';
import usersRoutes from './modules/users/routes.js';
import gamesRoutes from './modules/games/routes.js';
import friendsRoutes from './modules/friends/routes.js';
import messagesRoutes from './modules/messages/routes.js';
import forumsRoutes from './modules/forums/routes.js';
import eventsRoutes from './modules/events/routes.js';
import voiceRoutes from './modules/voice/routes.js';
import groupsRoutes from './modules/groups/routes.js';
import notificationsRoutes from './modules/notifications/routes.js';
import searchRoutes from './modules/search/routes.js';
import moderationRoutes from './modules/moderation/routes.js';
import communitiesRoutes from './modules/communities/routes.js';
import { topCommunities } from './modules/communities/communities.service.js';
import { CITY_NAMES } from './common/cities.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  if (env.corsOrigin === '*') {
    app.use(cors());
  } else {
    app.use(cors({ origin: env.corsOrigin.split(','), credentials: true }));
  }
  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', express.static(uploadsDir));

  // Santé
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv, time: new Date().toISOString() });
  });

  // Routes par domaine
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/friends', friendsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/forums', forumsRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/groups', groupsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/communities', communitiesRoutes);
  app.use('/api', moderationRoutes);

  // Dashboard d'accueil agrégé (évite N requêtes au mobile)
  app.get('/api/home', requireOptionalAuth, async (req, res, next) => {
    try {
      const db = (await import('./lib/prisma.js')).default;
      const userId = req.userId as string | undefined;
      const [announcements, events, topComm, games, communityIds] = await Promise.all([
        db.announcement.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
        db.event.findMany({
          where: { startDate: { gte: new Date() }, status: { not: 'CANCELLED' } },
          include: {
            game: { select: { id: true, name: true, slug: true, icon: true } },
            organizer: { select: { id: true, username: true, avatar: true } },
            _count: { select: { participants: true } },
          },
          orderBy: { startDate: 'asc' },
          take: 5,
        }),
        // ⬤ Top 3 communautés par nombre de membres
        topCommunities(3),
        userId
          ? db.userGame.findMany({
              where: { userId },
              include: { game: { select: { id: true, name: true, slug: true, icon: true } } },
              orderBy: { position: 'asc' },
              take: 3,
            })
          : Promise.resolve([]),
        userId
          ? db.gameCommunity.findMany({
              where: { members: { some: { userId } } },
              select: { gameId: true },
            })
          : Promise.resolve([]),
      ]);
      const myCommunityGameIds = new Set(communityIds.map((c: any) => c.gameId));
      res.json({
        data: {
          announcements: announcements.map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            createdAt: a.createdAt,
          })),
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            location: e.location,
            startDate: e.startDate,
            game: e.game ? { id: e.game.id, name: e.game.name, slug: e.game.slug, icon: e.game.icon } : null,
            organizer: e.organizer,
            participantsCount: e._count.participants,
          })),
          // ⬤ 3 communautés les plus populaires (accueil épuré)
          communities: topComm,
          games: games.map((g: any) => ({ id: g.gameId, name: g.game.name, slug: g.game.slug, icon: g.game.icon, position: g.position })),
          myCommunityGameIds: [...myCommunityGameIds],
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/cities', (_req, res) => {
    res.json({ data: CITY_NAMES });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}