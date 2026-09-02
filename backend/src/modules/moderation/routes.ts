import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody, validateParams, validateQuery } from '../../common/validate.js';
import { REPORT_TYPES, REPORT_STATUS } from '../../common/constants.js';
import * as moderation from './moderation.service.js';

const router = Router();
const reportId = z.object({ id: z.string() });
const userId = z.object({ id: z.string() });

// ─── Signalements (tous les utilisateurs authentifiés) ─────────────────────
router.post(
  '/reports',
  requireAuth,
  validateBody(
    z.object({
      contentType: z.enum(REPORT_TYPES),
      contentId: z.string().optional(),
      reportedUserId: z.string().optional(),
      reason: z.string().min(5).max(500),
    }),
  ),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await moderation.createReport(req.userId, req.body) });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Dashboard modération (MODERATOR + ADMIN) ───────────────────────────────
router.get('/moderation/reports', requireAuth, requireRole('MODERATOR', 'ADMIN'), validateQuery(z.object({ status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() })), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ data: await moderation.listReports(status, Number(req.query.page) || 1, Number(req.query.limit) || 20) });
  } catch (e) {
    next(e);
  }
});

router.patch('/moderation/reports/:id', requireAuth, requireRole('MODERATOR', 'ADMIN'), validateParams(reportId), validateBody(z.object({ status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']) })), async (req, res, next) => {
  try {
    res.json({ data: await moderation.resolveReport(req.params.id, req.body.status, req.userId) });
  } catch (e) {
    next(e);
  }
});

router.get('/moderation/users/banned', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    res.json({ data: await moderation.listBannedUsers() });
  } catch (e) {
    next(e);
  }
});

router.post('/moderation/users/:id/ban', requireAuth, requireRole('ADMIN'), validateParams(userId), validateBody(z.object({ reason: z.string().min(3), days: z.number().int().min(0).max(3650).optional() })), async (req, res, next) => {
  try {
    res.json({ data: await moderation.banUser(req.params.id, req.body.reason, req.body.days) });
  } catch (e) {
    next(e);
  }
});

router.post('/moderation/users/:id/unban', requireAuth, requireRole('ADMIN'), validateParams(userId), async (req, res, next) => {
  try {
    res.json({ data: await moderation.unbanUser(req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.delete('/moderation/content/:type/:id', requireAuth, requireRole('MODERATOR', 'ADMIN'), validateParams(z.object({ type: z.enum(REPORT_TYPES), id: z.string() })), async (req, res, next) => {
  try {
    res.json({ data: await moderation.deleteContent(req.params.type, req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.get('/moderation/stats', requireAuth, requireRole('MODERATOR', 'ADMIN'), async (req, res, next) => {
  try {
    res.json({ data: await moderation.dashboardStats() });
  } catch (e) {
    next(e);
  }
});

export default router;