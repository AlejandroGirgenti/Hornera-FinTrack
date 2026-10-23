import type { AuthResponse, LoginInput, RegisterInput } from '@fintrack/shared';
import { api } from '../../lib/api';

export const loginRequest = (input: LoginInput) =>
  api<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false });

export const registerRequest = (input: RegisterInput) =>
  api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });

export const logoutRequest = () => api<void>('/auth/logout', { method: 'POST', auth: false });
