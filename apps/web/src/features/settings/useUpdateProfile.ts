import { useMutation } from '@tanstack/react-query';
import { applyAccent } from '../../lib/accent';
import { useAuth } from '../auth/AuthContext';
import { updateProfileRequest } from './settings-api';

/**
 * Guarda el color de acento. Se aplica en pantalla al instante (así se ve el resultado sin
 * esperar al servidor) y, si el servidor lo rechaza o no hay conexión, se vuelve al anterior.
 */
export function useUpdateAccent() {
  const { user, updateUser } = useAuth();

  return useMutation({
    mutationFn: (input: { accentColor: string | null }) => updateProfileRequest(input),
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
