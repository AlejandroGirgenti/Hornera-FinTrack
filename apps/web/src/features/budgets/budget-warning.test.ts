import { describe, expect, it } from 'vitest';
import type { BudgetItemDto, BudgetsDto } from '@fintrack/shared';
import { budgetWarning } from './budget-warning';

const item = (id: string, name: string, limit: string | null, spent: string): BudgetItemDto => ({
  category: { id, name, color: '#000000' },
  limit,
  spent,
  remaining: null,
  percent: null,
  status: null,
});

const budgets: BudgetsDto = {
  month: '2026-10',
  totals: { budgeted: '0.00', spent: '0.00', remaining: '0.00', percent: null, status: null },
  items: [
    item('transporte', 'Transporte', '80000.00', '76400.00'),
    item('comida', 'Comida', '200000.00', '150000.00'),
  ],
  unbudgeted: [item('salud', 'Salud', null, '18500.00')],
};

const base = {
  budgets,
  month: '2026-10',
  type: 'EXPENSE' as const,
  categoryId: 'transporte',
  adding: '10000.00',
};

describe('budgetWarning', () => {
  it('avisa cuando el gasto nuevo supera el límite', () => {
    expect(budgetWarning(base)).toEqual({
      categoryName: 'Transporte',
      limit: '80000.00',
      total: '86400.00',
      over: '6400.00',
    });
  });

  it('no avisa si entra en el límite', () => {
    expect(budgetWarning({ ...base, adding: '3600.00' })).toBeNull();
    expect(budgetWarning({ ...base, categoryId: 'comida' })).toBeNull();
  });

  it('no avisa para ingresos, categorías sin límite ni si falta el monto', () => {
    expect(budgetWarning({ ...base, type: 'INCOME' })).toBeNull();
    expect(budgetWarning({ ...base, categoryId: 'salud' })).toBeNull();
    expect(budgetWarning({ ...base, adding: null })).toBeNull();
  });

  it('no avisa si los datos son de otro mes o todavía no cargaron', () => {
    expect(budgetWarning({ ...base, month: '2026-11' })).toBeNull();
    expect(budgetWarning({ ...base, budgets: undefined })).toBeNull();
  });

  it('al editar, no cuenta dos veces el gasto original', () => {
    // El gasto de 5.000 ya está en los 76.400: cambiarlo a 8.000 deja 79.400, dentro del límite
    const editing = { categoryId: 'transporte', month: '2026-10', amountInBase: '5000.00' };
    expect(budgetWarning({ ...base, adding: '8000.00', editing })).toBeNull();
    // Pero cambiarlo a 10.000 deja 81.400 y sí se pasa, por 1.400
    expect(budgetWarning({ ...base, adding: '10000.00', editing })).toMatchObject({
      total: '81400.00',
      over: '1400.00',
    });
  });

  it('al editar y cambiar de categoría, el original no se descuenta de la nueva', () => {
    const editing = { categoryId: 'comida', month: '2026-10', amountInBase: '5000.00' };
    expect(budgetWarning({ ...base, adding: '10000.00', editing })?.total).toBe('86400.00');
  });
});
