import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string; // userId
  role: string;
};

export type RefreshClaims = {
  sub: string;
  tid: string; // refresh token row id
};

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({ sub: userId, tid: tokenId }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  });
}

export function verifyRefreshToken(token: string): RefreshClaims {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshClaims;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}