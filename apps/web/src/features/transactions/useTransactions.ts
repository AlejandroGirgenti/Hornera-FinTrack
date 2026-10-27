import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTransactionInput,
  Paginated,
  TransactionDto,
  UpdateTransactionInput,
} from '@fintrack/shared';
import { api } from '../../lib/api';
import { toApiQuery } from './filters';
import type { TransactionFilters } from './filters';

export function useTransactionList(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', 'list', filters],
    queryFn: () => api<Paginated<TransactionDto>>(`/transactions?${toApiQuery(filters)}`),
    // Al cambiar de filtro o de página se sigue mostrando la lista anterior hasta que llegue la nueva
    placeholderData: keepPreviousData,
  });
}

/** Cualquier cambio en los movimientos invalida el listado, los reportes del dashboard y los presupuestos. */
function useInvalidateAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      // Lo gastado de cada categoría cambia: los presupuestos se recalculan
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    ]);
}

interface SaveVariables {
  /** Si viene, se edita ese movimiento; si no, se crea uno nuevo. */
  id?: string;
  input: CreateTransactionInput | UpdateTransactionInput;
}

export function useSaveTransaction() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: async ({ id, input }: SaveVariables) =>
      id
        ? (
            await api<{ data: TransactionDto }>(`/transactions/${id}`, {
              method: 'PATCH',
              body: input,
            })
          ).data
        : (await api<{ data: TransactionDto }>('/transactions', { method: 'POST', body: input }))
            .data,
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateAfterChange();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
