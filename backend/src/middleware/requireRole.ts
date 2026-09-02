import type { Request, Response, NextFunction } from 'express';
import { errors } from '../common/ApiError.js';

/** Restreint une route à certains rôles (ex: requireRole('ADMIN')). */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) return next(errors.unauthorized());
    if (!roles.includes(req.userRole)) return next(errors.forbidden());
    next();
  };
}