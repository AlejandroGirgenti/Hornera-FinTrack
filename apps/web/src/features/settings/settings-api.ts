import type {
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  UpdateProfileInput,
} from '@fintrack/shared';
import { api } from '../../lib/api';

export const updateProfileRequest = async (input: UpdateProfileInput) =>
  (await api<{ user: AuthUser }>('/auth/me', { method: 'PATCH', body: input })).user;

export const changeEmailRequest = async (input: ChangeEmailInput) =>
  (await api<{ user: AuthUser }>('/auth/me/email', { method: 'PATCH', body: input })).user;

export const changePasswordRequest = (input: ChangePasswordInput) =>
  api<void>('/auth/me/password', { method: 'PUT', body: input });

export const deleteAccountRequest = (input: DeleteAccountInput) =>
  api<void>('/auth/me', { method: 'DELETE', body: input });
