import type { Request, Response } from 'express';
import type {
  AuthResponse,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@fintrack/shared';
import { env } from '../../config/env';
import { unauthorized } from '../../lib/errors';
import * as authService from './auth.service';
import type { Session } from './auth.service';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, hashToken } from './tokens';

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

export async function updateMeHandler(req: Request, res: Response) {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  const user = await authService.updateProfile(req.userId, req.body as UpdateProfileInput);
  res.json({ user });
}

export async function changeEmailHandler(req: Request, res: Response) {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  const user = await authService.changeEmail(req.userId, req.body as ChangeEmailInput);
  res.json({ user });
}

export async function changePasswordHandler(req: Request, res: Response) {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  // La cookie del refresh token identifica esta sesión: es la única que sigue abierta
  const current = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.changePassword(
    req.userId,
    req.body as ChangePasswordInput,
    current ? hashToken(current) : null,
  );
  res.status(204).end();
}

export async function deleteMeHandler(req: Request, res: Response) {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  await authService.deleteAccount(req.userId, (req.body as DeleteAccountInput).password);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieBase);
  res.status(204).end();
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await authService.requestPasswordReset((req.body as ForgotPasswordInput).email);
  // Misma respuesta exista o no la cuenta
  res.status(202).json({
    message: 'Si el email tiene una cuenta, te enviamos un enlace para restablecer la contraseña.',
  });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await authService.resetPassword(req.body as ResetPasswordInput);
  res.status(204).end();
}
