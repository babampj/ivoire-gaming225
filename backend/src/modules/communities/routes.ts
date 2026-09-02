import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOptionalAuth } from '../../middleware/auth.js';
import { validateParams } from '../../common/validate.js';
import * as communities from './communities.service.js';

const router = Router();
const slugSchema = z.object({ slug: z.string().min(1) });

// Top communautés (accueil public)
router.get('/top', async (_req, res, next) => {
  try {
    res.json({ data: await communities.topCommunities(3) });
  } catch (e) {
    next(e);
  }
});

// Mes communautés (via favoris)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await communities.myCommunities(req.userId) });
  } catch (e) {
    next(e);
  }
});

// Détail communauté d'un jeu
router.get(
  '/game/:slug',
  requireOptionalAuth,
  validateParams(slugSchema),
  async (req, res, next) => {
    try {
      res.json({ data: await communities.getCommunityForGame(req.params.slug, req.userId) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;