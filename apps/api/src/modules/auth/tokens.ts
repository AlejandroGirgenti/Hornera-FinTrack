import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { unauthorized } from '../../lib/errors';

export const REFRESH_COOKIE_NAME = 'refresh_token';
/** La cookie solo viaja a /auth/refresh y /auth/logout, no a cada petición de la API. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Access token JWT de vida corta. Se guarda en memoria en el frontend. */
export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
}

/** Devuelve el id de usuario o lanza 401 si el token es inválido, está alterado o venció. */
export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) throw new Error('Payload inválido');
    return payload.sub;
  } catch {
    throw unauthorized('INVALID_ACCESS_TOKEN', 'El token de acceso es inválido o venció');
  }
}

/** Los refresh tokens se guardan hasheados: si se filtra la base, no se pueden usar. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Refresh token opaco y aleatorio (256 bits). Se entrega una sola vez; en la base va el hash. */
export function generateRefreshToken() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
  };
}
