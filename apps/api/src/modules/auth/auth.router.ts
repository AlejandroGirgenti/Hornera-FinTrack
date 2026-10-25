import { Router } from 'express';
import { loginSchema, registerSchema, updateProfileSchema } from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { credentialsLimiter } from '../../middlewares/rate-limit';
import { validateBody } from '../../middlewares/validate';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  updateMeHandler,
} from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', credentialsLimiter, validateBody(registerSchema), registerHandler);
authRouter.post('/login', credentialsLimiter, validateBody(loginSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, validateBody(updateProfileSchema), updateMeHandler);
