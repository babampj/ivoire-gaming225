import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from './ApiError.js';

type G = Record<string, unknown>;

/** Valide le corps de requête avec un schéma Zod (source de vérité serveur). */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      throw new ApiError(
        400,
        first
          ? `Champ "${String(first.path.join('.'))}" : ${first.message}`
          : 'Données invalides',
        'VALIDATION_ERROR',
        result.error.flatten(),
      );
    }
    req.body = result.data as unknown as G;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ApiError(400, 'Paramètres invalides', 'VALIDATION_ERROR', result.error.flatten());
    }
    req.params = result.data as never;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ApiError(400, 'Query invalide', 'VALIDATION_ERROR', result.error.flatten());
    }
    req.query = result.data as never;
    next();
  };
}