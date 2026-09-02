import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { CITY_NAMES } from '../../common/cities.js';
import * as events from './events.service.js';

const router = Router();

const eventBody = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  image: z.string().optional().nullable(),
  location: z.enum(CITY_NAMES),
  address: z.string().max(200).optional().nullable(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  link: z.string().url().optional().nullable(),
  gameSlug: z.string().optional(),
});

const eventIdSchema = z.object({ id: z.string() });

router.get(
  '/',
  validateQuery(
    z.object({
      gameSlug: z.string().optional(),
      city: z.string().optional(),
      status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ALL']).default('UPCOMING'),
    }),
  ),
  async (req, res, next) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : 'UPCOMING';
      res.json({
        data: await events.listEvents(
          {
            gameSlug: typeof req.query.gameSlug === 'string' ? req.query.gameSlug : undefined,
            city: typeof req.query.city === 'string' ? req.query.city : undefined,
          },
          status,
        ),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/participated', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await events.myEvents(req.userId) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', validateParams(eventIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await events.getEvent(req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, validateBody(eventBody), async (req, res, next) => {
  try {
    res.status(201).json({ data: await events.createEvent(req.userId, req.body) });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id',
  requireAuth,
  validateParams(eventIdSchema),
  validateBody(eventBody.partial()),
  async (req, res, next) => {
    try {
      res.json({ data: await events.updateEvent(req.params.id, req.userId, req.userRole, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:id',
  requireAuth,
  validateParams(eventIdSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await events.deleteEvent(req.params.id, req.userId, req.userRole) });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/:id/participate', requireAuth, validateParams(eventIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await events.participate(req.params.id, req.userId) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id/participate', requireAuth, validateParams(eventIdSchema), async (req, res, next) => {
  try {
    res.json({ data: await events.leave(req.params.id, req.userId) });
  } catch (e) {
    next(e);
  }
});

export default router;