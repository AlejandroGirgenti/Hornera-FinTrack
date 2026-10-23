/**
 * Fechas del frontend. "Este mes" depende de la zona horaria: se usa la de Buenos Aires de forma
 * explícita para coincidir con el backend, sin importar en qué zona esté el navegador.
 * Un mes se representa como "AAAA-MM" y una fecha pura como "AAAA-MM-DD".
 */
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const pad = (value: number) => String(value).padStart(2, '0');

/** Fecha de hoy en Buenos Aires ("2026-10-23"). `now` se puede inyectar para testear. */
export function todayInBuenosAires(now: Date = new Date()): string {
  // El locale en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Mes actual en Buenos Aires ("2026-10"). */
export function currentMonth(now: Date = new Date()): string {
  return todayInBuenosAires(now).slice(0, 7);
}

/** Suma (o resta) meses a un mes "AAAA-MM". */
export function addMonths(month: string, delta: number): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Primer y último día de un mes "AAAA-MM", como la API espera recibirlos. */
export function monthRange(month: string): { from: string; to: string } {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

/** "2026-10" → "octubre de 2026". */
export function formatMonthLabel(month: string): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/** "2026-10" → "oct" (para los ejes de los gráficos). */
export function formatMonthShort(month: string): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    .replace('.', '');
}
