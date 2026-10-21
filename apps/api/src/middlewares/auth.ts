import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/tokens';

/**
 * Exige un access token válido en `Authorization: Bearer <token>`.
 * El id de usuario sale del token firmado, nunca de datos que envíe el cliente.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const [scheme, token] = req.header('authorization')?.split(' ') ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso'));
  }

  try {
    req.userId = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
