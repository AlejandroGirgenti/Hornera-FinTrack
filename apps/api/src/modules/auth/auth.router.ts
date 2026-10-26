import { Router } from 'express';
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { credentialsLimiter, passwordResetLimiter } from '../../middlewares/rate-limit';
import { validateBody } from '../../middlewares/validate';
import {
  changeEmailHandler,
  changePasswordHandler,
  deleteMeHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  updateMeHandler,
} from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', credentialsLimiter, validateBody(registerSchema), registerHandler);
authRouter.post('/login', credentialsLimiter, validateBody(loginSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, validateBody(updateProfileSchema), updateMeHandler);

// Cambios que exigen la contraseña actual: con el mismo freno que el login contra la fuerza bruta
authRouter.patch(
  '/me/email',
  requireAuth,
  credentialsLimiter,
  validateBody(changeEmailSchema),
  changeEmailHandler,
);
authRouter.put(
  '/me/password',
  requireAuth,
  credentialsLimiter,
  validateBody(changePasswordSchema),
  changePasswordHandler,
);
authRouter.delete(
  '/me',
  requireAuth,
  credentialsLimiter,
  validateBody(deleteAccountSchema),
  deleteMeHandler,
);

// Recuperar la contraseña (no requiere sesión)
authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordHandler,
);
authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  resetPasswordHandler,
);
