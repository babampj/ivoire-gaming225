import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import * as groups from './groups.service.js';

const router = Router();

const groupId = z.object({ id: z.string() });

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await groups.myGroups(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  requireAuth,
  validateBody(z.object({ name: z.string().min(2).max(40), description: z.string().max(300).optional(), isTeam: z.boolean().optional(), friendIds: z.array(z.string()).max(50).optional() })),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await groups.createGroup(req.userId, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id', requireAuth, validateParams(groupId), async (req, res, next) => {
  try {
    res.json({ data: await groups.getGroup(req.params.id, req.userId) });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', requireAuth, validateParams(groupId), validateBody(z.object({ name: z.string().min(2).max(40).optional(), description: z.string().max(300).optional(), avatar: z.string().optional(), mainGameSlug: z.string().optional() })), async (req, res, next) => {
  try {
    res.json({ data: await groups.updateGroup(req.params.id, req.userId, req.userRole, req.body) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, validateParams(groupId), async (req, res, next) => {
  try {
    res.json({ data: await groups.deleteGroup(req.params.id, req.userId, req.userRole) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/invite', requireAuth, validateParams(groupId), validateBody(z.object({ userId: z.string() })), async (req, res, next) => {
  try {
    res.json({ data: await groups.inviteFriends(req.userId, req.params.id, req.body.userId) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/leave', requireAuth, validateParams(groupId), async (req, res, next) => {
  try {
    res.json({ data: await groups.leaveGroup(req.userId, req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/kick', requireAuth, validateParams(groupId), validateBody(z.object({ userId: z.string() })), async (req, res, next) => {
  try {
    res.json({ data: await groups.kickMember(req.userId, req.params.id, req.body.userId) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/messages', requireAuth, validateParams(groupId), validateQuery(z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().max(100).optional() })), async (req, res, next) => {
  try {
    res.json({ data: await groups.getMessages(req.params.id, req.userId, Number(req.query.page) || 1, Number(req.query.limit) || 50) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/messages', requireAuth, chatLimiter, validateParams(groupId), validateBody(z.object({ content: z.string().min(1).max(1000) })), async (req, res, next) => {
  try {
    res.status(201).json({ data: await groups.sendMessage(req.userId, req.params.id, req.body.content) });
  } catch (e) {
    next(e);
  }
});

export default router;