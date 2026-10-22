import { describe, expect, it } from 'vitest';
import {
  amountSchema,
  createTransactionSchema,
  exchangeRateSchema,
  isoDateSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from './index';

describe('amountSchema', () => {
  it('acepta números y strings y siempre devuelve string', () => {
    expect(amountSchema.parse('45000.5')).toBe('45000.5');
    expect(amountSchema.parse(45000.5)).toBe('45000.5');
    expect(amountSchema.parse(' 10 ')).toBe('10');
    expect(amountSchema.parse('999999999999.99')).toBe('999999999999.99');
  });

  it('rechaza cero, negativos, más de 2 decimales y texto', () => {
    for (const invalid of [0, '0', '0.00', -5, '-5', '1,5', '10.999', 'abc', '', '1e3', null]) {
      expect(amountSchema.safeParse(invalid).success, String(invalid)).toBe(false);
    }
  });

  it('rechaza montos que no entran en Decimal(14,2)', () => {
    expect(amountSchema.safeParse('1000000000000').success).toBe(false);
  });
});

describe('exchangeRateSchema', () => {
  it('acepta hasta 4 decimales y rechaza cero o más precisión', () => {
    expect(exchangeRateSchema.parse(1250)).toBe('1250');
    expect(exchangeRateSchema.parse('1250.1234')).toBe('1250.1234');
    expect(exchangeRateSchema.safeParse('0').success).toBe(false);
    expect(exchangeRateSchema.safeParse('1250.12345').success).toBe(false);
    expect(exchangeRateSchema.safeParse('-1').success).toBe(false);
  });
});

describe('isoDateSchema', () => {
  it('acepta fechas reales, incluido el 29 de febrero de un año bisiesto', () => {
    expect(isoDateSchema.safeParse('2026-10-18').success).toBe(true);
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true);
  });

  it('rechaza fechas inexistentes y formatos distintos', () => {
    for (const invalid of [
      '2026-02-30',
      '2027-02-29',
      '2026-13-01',
      '18/10/2026',
      '2026-1-5',
      '',
    ]) {
      expect(isoDateSchema.safeParse(invalid).success, invalid).toBe(false);
    }
  });
});

describe('createTransactionSchema', () => {
  const valid = {
    type: 'EXPENSE',
    amount: 45000,
    date: '2026-10-18',
    note: '  Supermercado ',
    categoryId: 'cat_1',
  };

  it('aplica ARS por defecto, normaliza el monto y recorta la nota', () => {
    expect(createTransactionSchema.parse(valid)).toEqual({
      type: 'EXPENSE',
      amount: '45000',
      currency: 'ARS',
      date: '2026-10-18',
      note: 'Supermercado',
      categoryId: 'cat_1',
    });
  });

  it('convierte una nota vacía en null', () => {
    expect(createTransactionSchema.parse({ ...valid, note: '   ' }).note).toBeNull();
  });

  it('exige tipo, monto, fecha y categoría', () => {
    expect(createTransactionSchema.safeParse({}).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...valid, categoryId: '' }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...valid, type: 'OTRO' }).success).toBe(false);
  });
});

describe('updateTransactionSchema', () => {
  it('exige al menos un campo y rechaza el cambio de tipo', () => {
    expect(updateTransactionSchema.safeParse({}).success).toBe(false);
    expect(updateTransactionSchema.safeParse({ type: 'INCOME' }).success).toBe(false);
    expect(updateTransactionSchema.safeParse({ amount: 10 }).success).toBe(true);
    expect(updateTransactionSchema.safeParse({ note: null }).success).toBe(true);
  });
});

describe('listTransactionsQuerySchema', () => {
  it('aplica valores por defecto', () => {
    expect(listTransactionsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'date',
      order: 'desc',
    });
  });

  it('convierte strings de la URL y acepta filtros', () => {
    const parsed = listTransactionsQuerySchema.parse({
      from: '2026-10-01',
      to: '2026-10-31',
      type: 'EXPENSE',
      page: '2',
      pageSize: '10',
      q: ' super ',
    });
    expect(parsed).toMatchObject({ page: 2, pageSize: 10, q: 'super', type: 'EXPENSE' });
  });

  it('rechaza un rango invertido y un tamaño de página excesivo', () => {
    expect(
      listTransactionsQuerySchema.safeParse({ from: '2026-11-01', to: '2026-10-01' }).success,
    ).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ sortBy: 'note' }).success).toBe(false);
  });
});
