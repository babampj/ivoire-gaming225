import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import * as voice from './voice.service.js';

const router = Router();

const roomIdSchema = z.object({ id: z.string() });
const userIdSchema = z.object({ userId: z.string() });

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await voice.listRooms(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  requireAuth,
  chatLimiter,
  validateBody(
    z.object({
      name: z.string().min(2).max(60),
      description: z.string().max(200).optional().nullable(),
      gameSlug: z.string().optional(),
      isPrivate: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await voice.createRoom(req.userId, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id', requireAuth, validateParams(roomIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await voice.getRoom(req.params.id, req.userId) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/join', requireAuth, validateParams(roomIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await voice.joinRoom(req.userId, req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/leave', requireAuth, validateParams(roomIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await voice.leaveRoom(req.userId, req.params.id) });
  } catch (e) {
    next(e);
  }
});

// 🔒 Passer en privé / public — réservé au créateur
router.patch(
  '/:id/access',
  requireAuth,
  validateParams(roomIdSchema),
  validateBody(z.object({ isPrivate: z.boolean() })),
  async (req, res, next) => {
    try {
      res.json({ data: await voice.togglePrivate(req.userId, req.params.id, req.body.isPrivate) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:id/invite',
  requireAuth,
  validateParams(roomIdSchema),
  validateBody(userIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await voice.inviteUser(req.userId, req.params.id, req.body.userId) });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/:id/kick', requireAuth, validateParams(roomIdSchema), validateBody(userIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await voice.kickUser(req.userId, req.params.id, req.body.userId) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, validateParams(roomIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await voice.deleteRoom(req.userId, req.params.id, req.userRole) });
  } catch (e) {
    next(e);
  }
});

export default router;