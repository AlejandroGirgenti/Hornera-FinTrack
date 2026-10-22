/**
 * Utilidades de fechas. Los movimientos se guardan como fecha pura (AAAA-MM-DD), pero "hoy" y
 * "este mes" dependen de la zona horaria. Un servidor en UTC, a las 22:00 en Buenos Aires, ya
 * estaría en el día (y a fin de mes, en el mes) siguiente: por eso la zona se usa de forma explícita.
 */
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const pad = (value: number) => String(value).padStart(2, '0');

/** Fecha de hoy en Buenos Aires con formato AAAA-MM-DD. `now` se puede inyectar para testear. */
export function todayInBuenosAires(now: Date = new Date()): string {
  // El locale en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Primer y último día del mes al que pertenece una fecha AAAA-MM-DD. */
export function monthRange(isoDate: string): { from: string; to: string } {
  const [year = 0, month = 0] = isoDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

/** Suma (o resta) meses a un mes con formato AAAA-MM. */
export function addMonths(yearMonth: string, delta: number): string {
  const [year = 0, month = 1] = yearMonth.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Los últimos `count` meses terminando en `endYearMonth` (inclusive), del más viejo al más nuevo. */
export function monthsBack(endYearMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(endYearMonth, i - (count - 1)));
}

/** Período de un reporte: el pedido, o el mes en curso (en Buenos Aires) si no se indicó. */
export function resolvePeriod(
  from?: string,
  to?: string,
  now: Date = new Date(),
): { from: string; to: string } {
  if (from && to) return { from, to };
  return monthRange(todayInBuenosAires(now));
}

/** Convierte AAAA-MM-DD a la Date (medianoche UTC) con la que Prisma maneja columnas @db.Date. */
export const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
