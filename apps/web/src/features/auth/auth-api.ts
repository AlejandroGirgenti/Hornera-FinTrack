import type {
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@fintrack/shared';
import { api } from '../../lib/api';

export const loginRequest = (input: LoginInput) =>
  api<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false });

export const registerRequest = (input: RegisterInput) =>
  api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });

export const logoutRequest = () => api<void>('/auth/logout', { method: 'POST', auth: false });

export const forgotPasswordRequest = (input: ForgotPasswordInput) =>
  api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: input, auth: false });

export const resetPasswordRequest = (input: ResetPasswordInput) =>
  api<void>('/auth/reset-password', { method: 'POST', body: input, auth: false });
