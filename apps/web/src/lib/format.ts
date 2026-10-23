import type { Currency } from '@fintrack/shared';

const formatters = new Map<Currency, Intl.NumberFormat>();

/**
 * Da formato de moneda argentino a un monto que viene de la API como string ("45000.50").
 * Solo se usa para mostrar: los cálculos se hacen siempre en el servidor con decimales exactos.
 */
export function formatMoney(amount: string | number, currency: Currency = 'ARS'): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(Number(amount));
}

/** "2026-10-01" → "1 oct". Se interpreta la fecha como pura, sin desfasarla por zona horaria. */
export function formatShortDate(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace('.', '');
}

const compactFormatter = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 1250000 → "1,3 M". Para los ejes de los gráficos, donde no entra el monto completo. */
export function formatCompact(amount: string | number): string {
  return compactFormatter.format(Number(amount));
}

const percentFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/** 12.5 → "12,5 %". Recibe el porcentaje ya calculado (como lo manda la API). */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)} %`;
}

/** "2026-10-23" → "23 oct 2026". */
export function formatDate(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
}
