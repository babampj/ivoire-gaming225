import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOptionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import { errors } from '../../common/ApiError.js';
import { getIO } from '../../lib/socket.js';
import prisma from '../../lib/prisma.js';
import { getFavorites } from '../users/user.dto.js';
import * as games from './games.service.js';

const router = Router();

const slugSchema = z.object({ slug: z.string().min(1) });
const gameIdSchema = z.object({ id: z.string() });

// ─── Liste des jeux ─────────────────────────────────────────────────────────
router.get('/', requireOptionalAuth, async (req, res, next) => {
  try {
    const all = await games.listGames();
    let favoriteIds: string[] = [];
    if (req.userId) {
      const favs = await getFavorites(req.userId);
      favoriteIds = favs.map((f) => f.id);
    }
    res.json({
      data: all.map((g) => ({ ...g, isFavorite: favoriteIds.includes(g.id) })),
    });
  } catch (e) {
    next(e);
  }
});

// ─── Détail d'un jeu ────────────────────────────────────────────────────────
router.get('/:slug', requireOptionalAuth, validateParams(slugSchema), async (req, res, next) => {
  try {
    const game = await games.getGame(req.params.slug);
    let isFavorite = false;
    if (req.userId) {
      const favs = await getFavorites(req.userId);
      isFavorite = favs.some((f) => f.slug === req.params.slug);
    }
    res.json({ data: { ...game, isFavorite } });
  } catch (e) {
    next(e);
  }
});

router.get(
  '/:slug/events',
  requireOptionalAuth,
  validateParams(slugSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await games.eventsForGame(req.params.slug) });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/:slug/discussions',
  requireOptionalAuth,
  validateParams(slugSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await games.popularDiscussionsByGame(req.params.slug) });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/:slug/online-players',
  requireOptionalAuth,
  validateParams(slugSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await games.onlinePlayersForGame(req.params.slug) });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Chat public du jeu (temps réel) ────────────────────────────────────────
router.get(
  '/:slug/chat',
  requireOptionalAuth,
  validateParams(slugSchema),
  validateQuery(z.object({ limit: z.coerce.number().max(100).optional() })),
  async (req, res, next) => {
    try {
      const history = await games.getChatHistory(req.params.slug, Number(req.query.limit) || 50);
      res.json({ data: history });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:slug/chat',
  requireAuth,
  chatLimiter,
  validateParams(slugSchema),
  validateBody(z.object({ content: z.string().min(1).max(1000) })),
  async (req, res, next) => {
    try {
      const game = await games.getGame(req.params.slug);
      const content = req.body.content.trim();
      if (!content) throw errors.badRequest('Message vide.');
      const msg = await prisma.gameChatMessage.create({
        data: { gameId: game.id, senderId: req.userId, content },
        include: { sender: { select: { id: true, username: true, avatar: true, status: true } } },
      });
      getIO().to(`game:${game.slug}`).emit('chat:message', msg);
      res.status(201).json({ data: msg });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Admin : CRUD jeux ──────────────────────────────────────────────────────
const gameBody = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.post('/', requireAuth, requireRole('ADMIN'), validateBody(gameBody), async (req, res, next) => {
  try {
    res.status(201).json({ data: await games.createGame(req.body) });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validateParams(gameIdSchema),
  validateBody(gameBody.partial()),
  async (req, res, next) => {
    try {
      res.json({ data: await games.updateGame(req.params.id, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validateParams(gameIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await games.deleteGame(req.params.id) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;