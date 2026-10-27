import { fromCents, projectedOverrun, toCents } from '@fintrack/shared';
import type { BudgetsDto, TransactionType } from '@fintrack/shared';

export interface BudgetWarning {
  categoryName: string;
  limit: string;
  /** Lo que quedaría gastado en la categoría con este movimiento. */
  total: string;
  /** Por cuánto se pasa del límite. */
  over: string;
}

interface WarningParams {
  budgets: BudgetsDto | undefined;
  /** Mes (AAAA-MM) al que pertenece la fecha del movimiento. */
  month: string;
  type: TransactionType;
  categoryId: string;
  /** Monto del movimiento en la moneda base; null si todavía no se puede calcular. */
  adding: string | null;
  /** Si se está editando un gasto, el original: su monto ya está sumado en lo gastado. */
  editing?: { categoryId: string; month: string; amountInBase: string } | null;
}

/**
 * Avisa, antes de guardar, si un gasto hace que la categoría supere su límite del mes. Solo es
 * un aviso: no impide guardar. Devuelve null si no corresponde avisar.
 */
export function budgetWarning(params: WarningParams): BudgetWarning | null {
  const { budgets, month, type, categoryId, adding, editing } = params;
  if (type !== 'EXPENSE' || !budgets || budgets.month !== month || !adding) return null;

  const item = budgets.items.find((candidate) => candidate.category.id === categoryId);
  if (!item?.limit) return null;

  let spent = toCents(item.spent);
  // Al editar, el gasto original ya figura en lo gastado: se descuenta para no contarlo dos veces
  if (editing && editing.categoryId === categoryId && editing.month === month) {
    spent = Math.max(0, spent - toCents(editing.amountInBase));
  }

  const overrun = projectedOverrun(item.limit, fromCents(spent), adding);
  if (!overrun) return null;
  return { categoryName: item.category.name, limit: item.limit, ...overrun };
}
