import { useMutation } from '@tanstack/react-query';
import type { AuthUser, UpdateProfileInput } from '@fintrack/shared';
import { applyAccent } from '../../lib/accent';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

/**
 * Guarda el color de acento. Se aplica en pantalla al instante (así se ve el resultado sin
 * esperar al servidor) y, si el servidor lo rechaza o no hay conexión, se vuelve al anterior.
 */
export function useUpdateAccent() {
  const { user, updateUser } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) =>
      (await api<{ user: AuthUser }>('/auth/me', { method: 'PATCH', body: input })).user,
    onMutate: (input) => {
      applyAccent(input.accentColor);
    },
    onSuccess: (saved) => {
      updateUser(saved);
    },
    onError: () => {
      applyAccent(user?.accentColor ?? null);
    },
  });
}
