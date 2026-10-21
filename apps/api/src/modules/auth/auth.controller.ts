import type { Request, Response } from 'express';
import type { AuthResponse, LoginInput, RegisterInput } from '@fintrack/shared';
import { env } from '../../config/env';
import { unauthorized } from '../../lib/errors';
import * as authService from './auth.service';
import type { Session } from './auth.service';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './tokens';

const cookieBase = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: REFRESH_COOKIE_PATH,
} as const;

function sendSession(res: Response, status: number, session: Session) {
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
    ...cookieBase,
    expires: session.refreshExpiresAt,
  });
  const body: AuthResponse = { user: session.user, accessToken: session.accessToken };
  res.status(status).json(body);
}

export async function registerHandler(req: Request, res: Response) {
  const session = await authService.register(req.body as RegisterInput);
  sendSession(res, 201, session);
}

export async function loginHandler(req: Request, res: Response) {
  const session = await authService.login(req.body as LoginInput);
  sendSession(res, 200, session);
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
    sendSession(res, 200, session);
  } catch (error) {
    // Si la sesión no sirve, se borra la cookie para que el navegador no siga enviándola
    res.clearCookie(REFRESH_COOKIE_NAME, cookieBase);
    throw error;
  }
}

export async function logoutHandler(req: Request, res: Response) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieBase);
  res.status(204).end();
}

export async function meHandler(req: Request, res: Response) {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  const user = await authService.getCurrentUser(req.userId);
  res.json({ user });
}
