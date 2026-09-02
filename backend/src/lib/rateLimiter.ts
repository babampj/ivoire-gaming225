import rateLimit from 'express-rate-limit';
import { ApiError } from '../common/ApiError.js';

function handler(_req: unknown, _res: unknown, _next: unknown, options: { message: string }) {
  throw new ApiError(429, options.message, 'RATE_LIMITED');
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives. Réessayez dans 15 minutes.',
  handler,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes.',
  handler,
});

export const chatLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Vous envoyez des messages trop rapidement.',
  handler,
});