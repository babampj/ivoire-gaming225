import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateQuery } from '../../common/validate.js';
import { chatLimiter } from '../../lib/rateLimiter.js';
import * as search from './search.service.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  chatLimiter,
  validateQuery(z.object({ q: z.string().min(1) })),
  async (req, res, next) => {
    try {
      res.json({ data: await search.globalSearch(String(req.query.q)) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;