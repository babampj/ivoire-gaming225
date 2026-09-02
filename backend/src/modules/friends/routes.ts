import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../common/validate.js';
import * as friends from './friends.service.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await friends.listFriends(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.get('/requests', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await friends.listFriendRequests(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/requests',
  requireAuth,
  validateBody(z.object({ userId: z.string() })),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await friends.sendFriendRequest(req.userId, req.body.userId) });
    } catch (e) {
      next(e);
    }
  },
);

const requestIdSchema = z.object({ id: z.string() });
const userIdSchema = z.object({ userId: z.string() });

router.post(
  '/requests/:id/accept',
  requireAuth,
  validateParams(requestIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await friends.respondToRequest(req.userId, req.params.id, true) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/requests/:id/decline',
  requireAuth,
  validateParams(requestIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await friends.respondToRequest(req.userId, req.params.id, false) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:userId',
  requireAuth,
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await friends.removeFriend(req.userId, req.params.userId) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/block/:userId',
  requireAuth,
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await friends.blockUser(req.userId, req.params.userId) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/suggestions', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await friends.suggestions(req.userId) });
  } catch (e) {
    next(e);
  }
});

export default router;