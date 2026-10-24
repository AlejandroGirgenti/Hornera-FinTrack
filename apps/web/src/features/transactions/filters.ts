import { TRANSACTION_TYPES } from '@fintrack/shared';
import type { TransactionType } from '@fintrack/shared';
import { monthRange } from '../../lib/dates';

export const PAGE_SIZE = 15;

export interface TransactionFilters {
  /** "AAAA-MM", o null para ver todo el historial. */
  month: string | null;
  type: TransactionType | '';
  categoryId: string;
  q: string;
  page: number;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Los filtros viven en la URL (?mes=2026-10&tipo=EXPENSE…): se puede recargar o compartir el
 * link sin perderlos. Todo valor inválido se descarta en vez de romper la pantalla.
 * `defaultMonth` es el mes que se usa si la URL no trae ninguno.
 */
export function parseFilters(params: URLSearchParams, defaultMonth: string): TransactionFilters {
  const rawMonth = params.get('mes');
  const month =
    rawMonth === null || (rawMonth !== 'todos' && !MONTH_PATTERN.test(rawMonth))
      ? defaultMonth
      : rawMonth === 'todos'
        ? null
        : rawMonth;
  const type = params.get('tipo');
  const page = Number(params.get('pagina'));

  return {
    month,
    type: TRANSACTION_TYPES.find((value) => value === type) ?? '',
    categoryId: params.get('categoria') ?? '',
    q: params.get('q') ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Inversa de `parseFilters`: solo escribe lo que se aparta del valor por defecto. */
export function toSearchParams(filters: TransactionFilters, defaultMonth: string): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.month === null) params.set('mes', 'todos');
  else if (filters.month !== defaultMonth) params.set('mes', filters.month);
  if (filters.type) params.set('tipo', filters.type);
  if (filters.categoryId) params.set('categoria', filters.categoryId);
  if (filters.q) params.set('q', filters.q);
  if (filters.page > 1) params.set('pagina', String(filters.page));
  return params;
}

/**
 * Query string para `GET /transactions`. Para la exportación a CSV se pide sin paginar
 * (`paged: false`): la API devuelve todos los movimientos que cumplen los filtros.
 */
export function toApiQuery(filters: TransactionFilters, { paged = true } = {}): string {
  const params = new URLSearchParams();
  if (paged) {
    params.set('page', String(filters.page));
    params.set('pageSize', String(PAGE_SIZE));
  }
  if (filters.month) {
    const { from, to } = monthRange(filters.month);
    params.set('from', from);
    params.set('to', to);
  }
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  const q = filters.q.trim();
  if (q) params.set('q', q);
  return params.toString();
}
