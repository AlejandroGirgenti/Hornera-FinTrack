import { rateLimit } from 'express-rate-limit';
import type { ApiErrorBody } from '@fintrack/shared';
import { env } from '../config/env';

const tooManyRequests: ApiErrorBody = {
  error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
};

/** Límite general para toda la API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooManyRequests,
  skip: () => env.isTest,
});

/**
 * Límite estricto para login y registro (frena la fuerza bruta).
 * Solo cuenta los intentos fallidos: un login correcto no consume cupo.
 */
export const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooManyRequests,
  skip: () => env.isTest,
});
