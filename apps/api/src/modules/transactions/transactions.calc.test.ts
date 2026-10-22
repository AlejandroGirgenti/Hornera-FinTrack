import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/errors';
import { convertToBase } from './transactions.calc';

const base = { baseCurrency: 'ARS' } as const;

describe('convertToBase', () => {
  it('no convierte cuando el movimiento ya está en la moneda base y descarta la cotización', () => {
    expect(convertToBase({ ...base, amount: '45000', currency: 'ARS' })).toEqual({
      exchangeRate: null,
      amountInBase: '45000.00',
    });
    expect(
      convertToBase({ ...base, amount: '100.5', currency: 'ARS', exchangeRate: '1250' }),
    ).toEqual({ exchangeRate: null, amountInBase: '100.50' });
  });

  it('convierte dólares a pesos y guarda la cotización con 4 decimales', () => {
    expect(convertToBase({ ...base, amount: '20', currency: 'USD', exchangeRate: '1250' })).toEqual(
      { exchangeRate: '1250.0000', amountInBase: '25000.00' },
    );
  });

  it('redondea a 2 decimales con mitad hacia arriba', () => {
    // 10.25 × 1200.5 = 12305.125 exacto -> 12305.13
    expect(
      convertToBase({ ...base, amount: '10.25', currency: 'USD', exchangeRate: '1200.5' })
        .amountInBase,
    ).toBe('12305.13');
    // 0.01 × 1250.5 = 12.505 -> 12.51
    expect(
      convertToBase({ ...base, amount: '0.01', currency: 'USD', exchangeRate: '1250.5' })
        .amountInBase,
    ).toBe('12.51');
  });

  it('no arrastra errores de punto flotante', () => {
    // En flotantes, 0.1 × 3 da 0.30000000000000004 y 1.15 × 100 da 114.99999999999999
    expect(
      convertToBase({ ...base, amount: '0.10', currency: 'USD', exchangeRate: '3' }).amountInBase,
    ).toBe('0.30');
    expect(
      convertToBase({ ...base, amount: '1.15', currency: 'USD', exchangeRate: '100' }).amountInBase,
    ).toBe('115.00');
  });

  it('exige la cotización cuando la moneda no es la base', () => {
    for (const exchangeRate of [undefined, null, '']) {
      let thrown: unknown;
      try {
        convertToBase({ ...base, amount: '20', currency: 'USD', exchangeRate });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(AppError);
      expect((thrown as AppError).status).toBe(400);
      expect((thrown as AppError).code).toBe('EXCHANGE_RATE_REQUIRED');
    }
  });

  it('rechaza cotizaciones en cero', () => {
    expect(() =>
      convertToBase({ ...base, amount: '20', currency: 'USD', exchangeRate: '0' }),
    ).toThrowError(/mayor a 0/);
  });

  it('rechaza resultados que no entran en la base de datos', () => {
    expect(() =>
      convertToBase({ ...base, amount: '999999999999.99', currency: 'USD', exchangeRate: '2' }),
    ).toThrowError(/demasiado grande/);
    // El límite exacto sí entra
    expect(
      convertToBase({ ...base, amount: '999999999999.99', currency: 'USD', exchangeRate: '1' })
        .amountInBase,
    ).toBe('999999999999.99');
  });

  it('también convierte cuando la moneda base es USD', () => {
    expect(
      convertToBase({
        amount: '125000',
        currency: 'ARS',
        baseCurrency: 'USD',
        exchangeRate: '0.0008',
      }),
    ).toEqual({ exchangeRate: '0.0008', amountInBase: '100.00' });
  });
});
