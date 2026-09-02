import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import * as messages from './messages.service.js';

const router = Router();

const userIdSchema = z.object({ userId: z.string() });

router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await messages.listConversations(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.get(
  '/:userId',
  requireAuth,
  validateParams(userIdSchema),
  validateQuery(z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().max(100).optional() })),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      res.json({ data: await messages.getConversation(req.userId, req.params.userId, page, limit) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:userId',
  requireAuth,
  chatLimiter,
  validateParams(userIdSchema),
  validateBody(z.object({ content: z.string().min(1).max(1000) })),
  async (req, res, next) => {
    try {
      const message = await messages.sendMessage(req.userId, req.params.userId, req.body.content.trim());
      res.status(201).json({ data: message });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:userId/read',
  requireAuth,
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await messages.markRead(req.userId, req.params.userId) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/conversations/:userId',
  requireAuth,
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await messages.deleteConversation(req.userId, req.params.userId) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;