import { z } from 'zod';
import { amountSchema } from './transactions';

/** Mes con formato AAAA-MM. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato AAAA-MM (por ejemplo 2026-10)');

const categoryIdSchema = z.string().min(1, 'La categoría es obligatoria');

export const budgetsQuerySchema = z.object({ month: monthSchema });

/** Fija (o cambia) el límite de gasto mensual de una categoría. */
export const setBudgetSchema = z.object({
  categoryId: categoryIdSchema,
  month: monthSchema,
  limitAmount: amountSchema,
});

export const removeBudgetQuerySchema = z.object({
  categoryId: categoryIdSchema,
  month: monthSchema,
});

/** Copia los límites del mes anterior a `month` (sin pisar los que ya estén cargados). */
export const copyBudgetsSchema = z.object({ month: monthSchema });

export type BudgetsQuery = z.infer<typeof budgetsQuerySchema>;
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
export type RemoveBudgetQuery = z.infer<typeof removeBudgetQuerySchema>;
export type CopyBudgetsInput = z.infer<typeof copyBudgetsSchema>;

/**
 * Cómo viene una categoría contra su límite:
 * - ok: menos del 80%
 * - near: del 80% al 99%
 * - limit: justo en el límite (100%)
 * - over: se pasó
 */
export type BudgetStatus = 'ok' | 'near' | 'limit' | 'over';

/** Desde qué porcentaje se avisa que falta poco para el límite. */
export const BUDGET_NEAR_PERCENT = 80;

/** Monto "12345.67" → centavos enteros, para comparar y sumar sin errores de decimales. */
export function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

/** Centavos enteros → "12345.67". */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Porcentaje gastado del límite, con 1 decimal (puede superar 100). */
export function budgetPercent(spent: string, limit: string): number {
  const limitCents = toCents(limit);
  if (limitCents <= 0) return 0;
  return Math.round((toCents(spent) / limitCents) * 1000) / 10;
}

export function budgetStatus(spent: string, limit: string): BudgetStatus {
  const spentCents = toCents(spent);
  const limitCents = toCents(limit);
  if (spentCents > limitCents) return 'over';
  if (spentCents === limitCents) return 'limit';
  // Comparación entera (spent / limit >= 80%) para no depender de decimales
  return spentCents * 100 >= limitCents * BUDGET_NEAR_PERCENT ? 'near' : 'ok';
}

/**
 * Si agregar `adding` al gasto actual `spent` supera el `limit`, devuelve cuánto quedaría gastado
 * y por cuánto se pasa; si no se pasa, null. Se usa para avisar antes de guardar un gasto.
 */
export function projectedOverrun(
  limit: string,
  spent: string,
  adding: string,
): { total: string; over: string } | null {
  const total = toCents(spent) + toCents(adding);
  const over = total - toCents(limit);
  if (over <= 0) return null;
  return { total: fromCents(total), over: fromCents(over) };
}

export interface BudgetCategoryDto {
  id: string;
  name: string;
  color: string;
}

/** Una categoría de gastos en un mes: lo gastado y, si tiene, su límite. */
export interface BudgetItemDto {
  category: BudgetCategoryDto;
  /** Límite del mes; null si la categoría no tiene presupuesto. */
  limit: string | null;
  /** Gastado en el mes, en la moneda base. */
  spent: string;
  /** Límite menos gastado (negativo si se pasó); null sin presupuesto. */
  remaining: string | null;
  /** Porcentaje gastado del límite (1 decimal); null sin presupuesto. */
  percent: number | null;
  status: BudgetStatus | null;
}

export interface BudgetTotalsDto {
  /** Suma de los límites del mes. */
  budgeted: string;
  /** Gastado en las categorías que tienen límite. */
  spent: string;
  remaining: string;
  percent: number | null;
  status: BudgetStatus | null;
}

export interface BudgetsDto {
  month: string;
  totals: BudgetTotalsDto;
  /** Categorías con límite, ordenadas por nombre. */
  items: BudgetItemDto[];
  /** Categorías de gastos sin límite, de la que más gastó a la que menos. */
  unbudgeted: BudgetItemDto[];
}

export interface SavedBudgetDto {
  categoryId: string;
  month: string;
  limitAmount: string;
}

export interface CopiedBudgetsDto {
  /** Mes de origen (el anterior). */
  from: string;
  /** Cuántos límites se copiaron. */
  copied: number;
}
