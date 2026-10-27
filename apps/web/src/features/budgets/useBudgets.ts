import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BudgetsDto,
  CopiedBudgetsDto,
  SavedBudgetDto,
  SetBudgetInput,
} from '@fintrack/shared';
import { api } from '../../lib/api';

/** Estado de los presupuestos de un mes ("AAAA-MM"): límites y lo gastado en cada categoría. */
export function useBudgets(month: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: async () => (await api<{ data: BudgetsDto }>(`/budgets?month=${month}`)).data,
    // Al cambiar de mes se sigue mostrando el anterior (atenuado) hasta que llegue el nuevo
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['budgets'] });
}

export function useSetBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (input: SetBudgetInput) =>
      (await api<{ data: SavedBudgetDto }>('/budgets', { method: 'PUT', body: input })).data,
    onSuccess: invalidate,
  });
}

export function useRemoveBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ categoryId, month }: { categoryId: string; month: string }) =>
      api<undefined>(`/budgets?categoryId=${encodeURIComponent(categoryId)}&month=${month}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

export function useCopyBudgets() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (month: string) =>
      (
        await api<{ data: CopiedBudgetsDto }>('/budgets/copy', {
          method: 'POST',
          body: { month },
        })
      ).data,
    onSuccess: invalidate,
  });
}
