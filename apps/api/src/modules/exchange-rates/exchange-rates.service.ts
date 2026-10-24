import { z } from 'zod';
import type { UsdRateDto, UsdRateType } from '@fintrack/shared';
import { badGateway } from '../../lib/errors';
import { logger } from '../../lib/logger';

const SOURCE = 'dolarapi.com';
const BASE_URL = 'https://dolarapi.com/v1/dolares';
const CACHE_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5_000;

const providerSchema = z.object({
  compra: z.number().positive(),
  venta: z.number().positive(),
  fechaActualizacion: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
});

interface Dependencies {
  /** Se puede reemplazar en los tests para no salir a internet. */
  fetchFn?: typeof fetch;
  now?: () => number;
}

interface CacheEntry {
  rate: UsdRateDto;
  expiresAt: number;
}

// La cotización cambia pocas veces por hora: se guarda 10 minutos para no depender de la fuente
// en cada pantalla ni gastar su cupo de pedidos.
const cache = new Map<UsdRateType, CacheEntry>();

export function clearRateCache() {
  cache.clear();
}

const unavailable = () =>
  badGateway(
    'RATE_PROVIDER_UNAVAILABLE',
    'No se pudo obtener la cotización en este momento. Ingresala a mano.',
  );

async function fetchFromProvider(type: UsdRateType, fetchFn: typeof fetch): Promise<UsdRateDto> {
  const response = await fetchFn(`${BASE_URL}/${type}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`La fuente respondió ${response.status}`);

  const data = providerSchema.parse(await response.json());
  return {
    type,
    buy: data.compra.toFixed(2),
    sell: data.venta.toFixed(2),
    updatedAt: new Date(data.fechaActualizacion).toISOString(),
    source: SOURCE,
  };
}

/**
 * Cotización actual del dólar contra el peso argentino. Si la fuente falla pero hay un valor
 * guardado (aunque esté vencido), se devuelve ese: es mejor una cotización de hace un rato que
 * ninguna, y la fecha de actualización avisa de qué momento es.
 */
export async function getUsdRate(
  type: UsdRateType,
  { fetchFn = fetch, now = Date.now }: Dependencies = {},
): Promise<UsdRateDto> {
  const cached = cache.get(type);
  if (cached && cached.expiresAt > now()) return cached.rate;

  try {
    const rate = await fetchFromProvider(type, fetchFn);
    cache.set(type, { rate, expiresAt: now() + CACHE_TTL_MS });
    return rate;
  } catch (error) {
    logger.warn({ err: error, type }, 'No se pudo obtener la cotización del dólar');
    if (cached) return cached.rate;
    throw unavailable();
  }
}
