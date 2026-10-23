import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@fintrack/shared';
import { api } from '../../lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api<{ data: CategoryDto[] }>('/categories')).data,
    staleTime: 5 * 60_000,
  });
}

/**
 * El nombre y el color de una categoría aparecen en los movimientos y en los reportes, por eso
 * un cambio invalida también esos datos.
 */
function useInvalidateAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ['categories', 'transactions', 'reports'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

interface SaveVariables {
  /** Si viene, se edita esa categoría; si no, se crea una nueva. */
  id?: string;
  input: CreateCategoryInput | UpdateCategoryInput;
}

export function useSaveCategory() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: async ({ id, input }: SaveVariables) =>
      id
        ? (await api<{ data: CategoryDto }>(`/categories/${id}`, { method: 'PATCH', body: input }))
            .data
        : (await api<{ data: CategoryDto }>('/categories', { method: 'POST', body: input })).data,
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
