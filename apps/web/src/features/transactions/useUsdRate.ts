import { useQuery } from '@tanstack/react-query';
import type { UsdRateDto, UsdRateType } from '@fintrack/shared';
import { api } from '../../lib/api';

/** Cotización actual de un tipo de dólar (el servidor la guarda 10 minutos). */
export function useUsdRate(type: UsdRateType, enabled: boolean) {
  return useQuery({
    queryKey: ['exchange-rates', 'usd', type],
    queryFn: async () => (await api<{ data: UsdRateDto }>(`/exchange-rates/usd?type=${type}`)).data,
    enabled,
    staleTime: 10 * 60_000,
    // Si la fuente está caída no tiene sentido insistir: la persona puede ingresarla a mano
    retry: false,
  });
}
