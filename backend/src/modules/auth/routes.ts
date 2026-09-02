import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../common/validate.js';
import { authLimiter } from '../../lib/rateLimiter.js';
import { requireAuth } from '../../middleware/auth.js';
import { errors } from '../../common/ApiError.js';
import { CITY_NAMES } from '../../common/cities.js';
import prisma from '../../lib/prisma.js';
import * as authService from './auth.service.js';

const router = Router();

const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir une lettre.')
  .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre.');

router.post(
  '/register',
  authLimiter,
  validateBody(
    z.object({
      username: z.string().min(3).max(24, 'Le pseudo doit contenir entre 3 et 24 caractères.'),
      email: z.string().email('Email invalide.'),
      password,
      city: z.enum(CITY_NAMES, { message: 'Ville invalide.' }),
      birthDate: z.string().optional(),
      gameSlugs: z.array(z.string()).max(3, "Tu peux sélectionner jusqu'à 3 jeux favoris.").optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      res.status(201).json({ data: await authService.register(req.body) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/login',
  authLimiter,
  validateBody(
    z.object({
      identifier: z.string().min(1, 'Identifiant requis.'),
      password: z.string().min(1, 'Mot de passe requis.'),
    }),
  ),
  async (req, res, next) => {
    try {
      res.json({ data: await authService.login(req.body.identifier, req.body.password) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/refresh',
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      res.json({ data: { tokens: await authService.refresh(req.body.refreshToken) } });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/logout',
  requireAuth,
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/forgot-password',
  authLimiter,
  validateBody(z.object({ email: z.string().email() })),
  async (req, res, next) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json({
        data: {
          message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
          devResetToken: result.devResetToken,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/reset-password',
  authLimiter,
  validateBody(z.object({ token: z.string().min(1), newPassword: password })),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  validateBody(z.object({ oldPassword: z.string().min(1), newPassword: password })),
  async (req, res, next) => {
    try {
      await authService.changePassword(req.userId, req.body.oldPassword, req.body.newPassword);
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

// Quick utilitaire pour le dev : enregistre un device push token
router.post(
  '/push-token',
  requireAuth,
  validateBody(z.object({ token: z.string().min(10), platform: z.string().optional() })),
  async (req, res, next) => {
    try {
      await prisma.pushToken.upsert({
        where: { token: req.body.token },
        update: { userId: req.userId },
        create: { token: req.body.token, platform: req.body.platform ?? 'expo', userId: req.userId },
      });
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

export default router;