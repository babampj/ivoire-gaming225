import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOptionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { upload, fileUrl } from '../../middleware/upload.js';
import { errors } from '../../common/ApiError.js';
import { CITY_NAMES } from '../../common/cities.js';
import prisma from '../../lib/prisma.js';
import { pageFromQuery, paginate } from '../../common/paginate.js';
import * as us from './users.service.js';
import { toUserCard, getFavorites } from './user.dto.js';

const router = Router();

const userIdSchema = z.object({ id: z.string() });

// ─── Mon profil ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await us.getMe(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/me',
  requireAuth,
  validateBody(
    z.object({
      username: z.string().min(3).max(24).optional(),
      bio: z.string().max(200).optional().nullable(),
      city: z.enum(CITY_NAMES).optional(),
      birthDate: z.string().optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const user = await us.updateProfile(req.userId, req.body);
      res.json({ data: toUserCard(user) });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/me/avatar', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw errors.badRequest('Aucune image fournie.');
    const user = await us.setAvatar(req.userId, fileUrl(req.file.filename));
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

// ─── Jeux favoris (max 3) ──────────────────────────────────────────────────
router.patch(
  '/me/favorites',
  requireAuth,
  validateBody(
    z.object({
      gameSlugs: z.array(z.string()).max(3, "Tu peux sélectionner jusqu'à 3 jeux favoris."),
    }),
  ),
  async (req, res, next) => {
    try {
      await us.setFavoritesBySlugs(req.userId, req.body.gameSlugs);
      res.json({ data: { favorites: await getFavorites(req.userId) } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Confidentialité ───────────────────────────────────────────────────────
router.patch(
  '/me/privacy',
  requireAuth,
  validateBody(
    z.object({
      showOnline: z.boolean().optional(),
      allowFriendRequests: z.boolean().optional(),
      allowDirectMessages: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      res.json({ data: await us.updatePrivacy(req.userId, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Fantômes / blocage ────────────────────────────────────────────────────
const friendIdSchema = z.object({ userId: z.string() });

router.get('/me/blocked', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.blockedUser.findMany({
      where: { blockerId: req.userId },
      include: { blocked: { select: { id: true, username: true, avatar: true } } },
    });
    res.json({ data: rows.map((r) => r.blocked) });
  } catch (e) {
    next(e);
  }
});

router.delete(
  '/me/blocked/:userId',
  requireAuth,
  validateParams(friendIdSchema),
  async (req, res, next) => {
    try {
      await prisma.blockedUser.deleteMany({
        where: { blockerId: req.userId, blockedId: req.params.userId },
      });
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Profils publics ───────────────────────────────────────────────────────
router.get(
  '/:id',
  requireOptionalAuth,
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      const meId = req.userId ?? undefined;
      res.json({ data: await us.getProfile(req.params.id, meId) });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/:id/friends',
  requireOptionalAuth,
  validateParams(userIdSchema),
  validateQuery(z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional() })),
  async (req, res, next) => {
    try {
      const { page, limit, skip, take } = pageFromQuery(req.query as Record<string, unknown>);
      const total = await prisma.friendship.count({ where: { userId: req.params.id } });
      const rows = await prisma.friendship.findMany({
        where: { userId: req.params.id },
        include: { friend: { select: { id: true, username: true, avatar: true, bio: true, city: true, status: true, lastSeen: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
      res.json({ data: paginate(rows.map((r) => r.friend), total, page, limit) });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Admin : liste des utilisateurs ────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'MODERATOR'),
  validateQuery(z.object({ q: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() })),
  async (req, res, next) => {
    try {
      const { page, limit, skip, take } = pageFromQuery(req.query as Record<string, unknown>);
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const where = q
        ? { OR: [{ username: { contains: q } }, { email: { contains: q } }] }
        : {};
      const [total, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: { id: true, username: true, email: true, role: true, avatar: true, city: true, status: true, banned: true, banExpiresAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);
      res.json({ data: paginate(rows, total, page, limit) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;