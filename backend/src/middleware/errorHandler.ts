import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/ApiError.js';
import { isDev } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Route introuvable', code: 'NOT_FOUND' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    });
    return;
  }

  const prismaError = err as { code?: string };
  if (prismaError.code === 'P2002') {
    res.status(409).json({ error: { message: 'Une valeur unique existe déjà (pseudo ou email).', code: 'CONFLICT' } });
    return;
  }

  if (isDev()) console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR',
    },
  });
}