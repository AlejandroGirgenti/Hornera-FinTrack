import { describe, expect, it } from 'vitest';
import { byCategoryQuerySchema, monthlyTrendQuerySchema, summaryQuerySchema } from './index';

describe('summaryQuerySchema', () => {
  it('acepta un período completo o ninguno', () => {
    expect(summaryQuerySchema.safeParse({}).success).toBe(true);
    expect(summaryQuerySchema.safeParse({ from: '2026-10-01', to: '2026-10-31' }).success).toBe(
      true,
    );
  });

  it('rechaza un período incompleto o invertido', () => {
    expect(summaryQuerySchema.safeParse({ from: '2026-10-01' }).success).toBe(false);
    expect(summaryQuerySchema.safeParse({ to: '2026-10-31' }).success).toBe(false);
    expect(summaryQuerySchema.safeParse({ from: '2026-11-01', to: '2026-10-01' }).success).toBe(
      false,
    );
    expect(summaryQuerySchema.safeParse({ from: 'ayer', to: 'hoy' }).success).toBe(false);
  });
});

describe('byCategoryQuerySchema', () => {
  it('usa gastos por defecto y acepta ingresos', () => {
    expect(byCategoryQuerySchema.parse({}).type).toBe('EXPENSE');
    expect(byCategoryQuerySchema.parse({ type: 'INCOME' }).type).toBe('INCOME');
    expect(byCategoryQuerySchema.safeParse({ type: 'OTRO' }).success).toBe(false);
  });
});

describe('monthlyTrendQuerySchema', () => {
  it('usa 6 meses por defecto y convierte el texto de la URL', () => {
    expect(monthlyTrendQuerySchema.parse({}).months).toBe(6);
    expect(monthlyTrendQuerySchema.parse({ months: '12' }).months).toBe(12);
  });

  it('limita la cantidad de meses entre 1 y 24', () => {
    for (const months of ['0', '25', '-1', '1.5', 'abc']) {
      expect(monthlyTrendQuerySchema.safeParse({ months }).success, months).toBe(false);
    }
    expect(monthlyTrendQuerySchema.safeParse({ months: '24' }).success).toBe(true);
  });
});
