import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';
import { ApiError, errors } from '../common/ApiError.js';

/**
 * Authentification par JWT (Bearer). On recharge l'utilisateur depuis la base
 * pour appliquer les bans/expiration sans jamais se fier au token seul.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw errors.unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw errors.unauthorized('Token invalide ou expiré');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, banned: true, banExpiresAt: true },
    });
    if (!user) throw errors.unauthorized('Utilisateur introuvable');

    if (user.banned) {
      if (user.banExpiresAt && user.banExpiresAt.getTime() < Date.now()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { banned: false, banReason: null, banExpiresAt: null },
        });
      } else {
        throw new ApiError(403, 'Votre compte est temporairement suspendu.', 'BANNED');
      }
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireOptionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, role: true, banned: true },
        });
        if (user && !user.banned) {
          req.userId = user.id;
          req.userRole = user.role;
        }
      } catch {
        // token invalide → considéré anonyme
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}