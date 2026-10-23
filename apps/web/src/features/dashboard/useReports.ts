import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ByCategoryDto, MonthlyTrendPointDto, SummaryDto } from '@fintrack/shared';
import { api } from '../../lib/api';
import { monthRange } from '../../lib/dates';

// keepPreviousData: al cambiar de mes se sigue mostrando el anterior (atenuado) hasta que llegue
// el nuevo, en lugar de volver al esqueleto de carga en cada clic.

export function useSummary(month: string) {
  const { from, to } = monthRange(month);
  return useQuery({
    queryKey: ['reports', 'summary', month],
    queryFn: async () =>
      (await api<{ data: SummaryDto }>(`/reports/summary?from=${from}&to=${to}`)).data,
    placeholderData: keepPreviousData,
  });
}

export function useExpensesByCategory(month: string) {
  const { from, to } = monthRange(month);
  return useQuery({
    queryKey: ['reports', 'by-category', 'EXPENSE', month],
    queryFn: async () =>
      (
        await api<{ data: ByCategoryDto }>(
          `/reports/by-category?from=${from}&to=${to}&type=EXPENSE`,
        )
      ).data,
    placeholderData: keepPreviousData,
  });
}

/** Evolución de los últimos meses; la API la calcula hasta el mes en curso. */
export function useMonthlyTrend(months = 6) {
  return useQuery({
    queryKey: ['reports', 'monthly-trend', months],
    queryFn: async () =>
      (await api<{ data: MonthlyTrendPointDto[] }>(`/reports/monthly-trend?months=${months}`)).data,
  });
}
