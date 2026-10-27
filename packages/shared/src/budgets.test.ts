import { describe, expect, it } from 'vitest';
import {
  budgetPercent,
  budgetStatus,
  copyBudgetsSchema,
  fromCents,
  monthSchema,
  projectedOverrun,
  removeBudgetQuerySchema,
  setBudgetSchema,
  toCents,
} from './budgets';

describe('centavos', () => {
  it('convierte sin errores de decimales', () => {
    expect(toCents('0.10')).toBe(10);
    expect(toCents('1234.56')).toBe(123456);
    expect(toCents('0.07') + toCents('0.01')).toBe(8);
    expect(fromCents(123456)).toBe('1234.56');
    expect(fromCents(5)).toBe('0.05');
  });
});

describe('budgetPercent', () => {
  it('calcula el porcentaje con 1 decimal y puede superar 100', () => {
    expect(budgetPercent('150000.00', '200000.00')).toBe(75);
    expect(budgetPercent('76400.00', '80000.00')).toBe(95.5);
    expect(budgetPercent('146000.00', '120000.00')).toBe(121.7);
    expect(budgetPercent('0.00', '100.00')).toBe(0);
  });

  it('con límite cero devuelve 0 en lugar de dividir por cero', () => {
    expect(budgetPercent('10.00', '0.00')).toBe(0);
  });
});

describe('budgetStatus', () => {
  const limit = '1000.00';

  it('ok por debajo del 80%', () => {
    expect(budgetStatus('0.00', limit)).toBe('ok');
    expect(budgetStatus('799.99', limit)).toBe('ok');
  });

  it('near desde el 80% y hasta antes del límite', () => {
    expect(budgetStatus('800.00', limit)).toBe('near');
    expect(budgetStatus('999.99', limit)).toBe('near');
  });

  it('limit justo en el límite y over cuando se pasa', () => {
    expect(budgetStatus('1000.00', limit)).toBe('limit');
    expect(budgetStatus('1000.01', limit)).toBe('over');
  });
});

describe('projectedOverrun', () => {
  it('avisa cuánto se pasa el gasto nuevo', () => {
    expect(projectedOverrun('80000.00', '76400.00', '10000')).toEqual({
      total: '86400.00',
      over: '6400.00',
    });
  });

  it('no avisa si queda justo en el límite o por debajo', () => {
    expect(projectedOverrun('80000.00', '76400.00', '3600')).toBeNull();
    expect(projectedOverrun('80000.00', '76400.00', '100')).toBeNull();
  });

  it('avisa aunque ya estuviera pasado de antes', () => {
    expect(projectedOverrun('100.00', '150.00', '10')).toEqual({ total: '160.00', over: '60.00' });
  });
});

describe('esquemas', () => {
  it('el mes tiene que ser AAAA-MM válido', () => {
    expect(monthSchema.safeParse('2026-10').success).toBe(true);
    expect(monthSchema.safeParse('2026-13').success).toBe(false);
    expect(monthSchema.safeParse('2026-1').success).toBe(false);
    expect(monthSchema.safeParse('2026-10-01').success).toBe(false);
  });

  it('el límite es un monto positivo con hasta 2 decimales, y siempre sale como texto', () => {
    const ok = setBudgetSchema.safeParse({
      categoryId: 'c1',
      month: '2026-10',
      limitAmount: 200000,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.limitAmount).toBe('200000');
    expect(
      setBudgetSchema.safeParse({ categoryId: 'c1', month: '2026-10', limitAmount: 0 }).success,
    ).toBe(false);
    expect(
      setBudgetSchema.safeParse({ categoryId: 'c1', month: '2026-10', limitAmount: '10.123' })
        .success,
    ).toBe(false);
    expect(
      setBudgetSchema.safeParse({ categoryId: '', month: '2026-10', limitAmount: 10 }).success,
    ).toBe(false);
  });

  it('quitar y copiar piden mes (y categoría al quitar)', () => {
    expect(removeBudgetQuerySchema.safeParse({ categoryId: 'c1', month: '2026-10' }).success).toBe(
      true,
    );
    expect(removeBudgetQuerySchema.safeParse({ month: '2026-10' }).success).toBe(false);
    expect(copyBudgetsSchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(copyBudgetsSchema.safeParse({}).success).toBe(false);
  });
});
