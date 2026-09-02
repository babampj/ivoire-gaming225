import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import * as notifications from './notifications.service.js';

const router = Router();
const idSchema = z.object({ id: z.string() });

router.get(
  '/',
  requireAuth,
  validateQuery(z.object({ unreadOnly: z.enum(['true', 'false']).optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() })),
  async (req, res, next) => {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      res.json({ data: await notifications.listNotifications(req.userId, unreadOnly, Number(req.query.page) || 1, Number(req.query.limit) || 30) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: { count: await notifications.unreadCount(req.userId) } });
  } catch (e) {
    next(e);
  }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await notifications.markAllRead(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/read', requireAuth, validateParams(idSchema), async (req, res, next) => {
  try {
    res.json({ data: await notifications.markRead(req.userId, req.params.id) });
  } catch (e) {
    next(e);
  }
});

// ─── Annonces (affichées sur l'accueil) ─────────────────────────────────────
router.get('/announcements', async (_req, res, next) => {
  try {
    res.json({ data: await notifications.listAnnouncements() });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/admin/announcements',
  requireAuth,
  requireRole('ADMIN'),
  validateBody(z.object({ title: z.string().min(3).max(120), content: z.string().min(3).max(2000), image: z.string().optional() })),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await notifications.createAnnouncement(req.userId, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;