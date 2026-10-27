import type { BudgetStatus, Currency } from '@fintrack/shared';
import { formatAmount } from '../../lib/format';

export const STATUS_LABEL: Record<BudgetStatus, string> = {
  ok: 'Vas bien',
  near: 'Cerca del límite',
  limit: 'En el límite',
  over: 'Te pasaste',
};

/** Color de la barra de progreso. */
export const STATUS_BAR: Record<BudgetStatus, string> = {
  ok: 'bg-emerald-500 dark:bg-emerald-400',
  near: 'bg-amber-500 dark:bg-amber-400',
  limit: 'bg-amber-500 dark:bg-amber-400',
  over: 'bg-rose-500 dark:bg-rose-400',
};

/** Color del texto asociado al estado (porcentaje, "te quedan…"). */
export const STATUS_TEXT: Record<BudgetStatus, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  near: 'text-amber-600 dark:text-amber-400',
  limit: 'text-amber-600 dark:text-amber-400',
  over: 'text-rose-600 dark:text-rose-400',
};

/** Etiqueta con fondo suave. */
export const STATUS_CHIP: Record<BudgetStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  near: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  limit: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  over: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
};

/** Ancho de la barra (0 a 100): se llena hasta el tope aunque el gasto lo supere. */
export function barWidth(percent: number | null): number {
  if (percent === null || !Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** "Te quedan $ 50.000" o "Excedido por $ 26.000". */
export function remainingText(remaining: string, currency: Currency): string {
  const value = Number(remaining);
  return value >= 0
    ? `Te quedan ${formatAmount(value, currency)}`
    : `Excedido por ${formatAmount(-value, currency)}`;
}
