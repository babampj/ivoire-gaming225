import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOptionalAuth } from '../../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import * as forums from './forums.service.js';

const router = Router();

const slugSchema = z.object({ slug: z.string() });
const forumIdSchema = z.object({ id: z.string() });
const postIdSchema = z.object({ postId: z.string() });

router.get(
  '/game/:slug',
  requireOptionalAuth,
  validateParams(slugSchema),
  validateQuery(
    z.object({
      sort: z.enum(['recent', 'popular', 'trending']).default('recent'),
      q: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().max(50).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      res.json({
        data: await forums.listForums(req.params.slug, req.query.sort as never, q, page, limit),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/game/:slug',
  requireAuth,
  chatLimiter,
  validateParams(slugSchema),
  validateBody(z.object({ title: z.string().min(4).max(120), content: z.string().min(2).max(5000) })),
  async (req, res, next) => {
    try {
      res.status(201).json({
        data: await forums.createForum(req.userId, req.params.slug, req.body.title, req.body.content),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/:id',
  requireOptionalAuth,
  validateParams(forumIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await forums.getForum(req.params.id, req.userId) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:id',
  requireAuth,
  validateParams(forumIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await forums.deleteForum(req.params.id, req.userId, req.userRole) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:id/posts',
  requireAuth,
  chatLimiter,
  validateParams(forumIdSchema),
  validateBody(z.object({ content: z.string().min(1).max(2000) })),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await forums.createPost(req.userId, req.params.id, req.body.content) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/posts/:postId/like',
  requireAuth,
  validateParams(postIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await forums.toggleLike(req.userId, req.params.postId) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/posts/:postId',
  requireAuth,
  validateParams(postIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await forums.deletePost(req.params.postId, req.userId, req.userRole) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;