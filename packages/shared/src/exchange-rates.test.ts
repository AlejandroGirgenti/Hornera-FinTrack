import { describe, expect, it } from 'vitest';
import { USD_RATE_TYPES, usdRateQuerySchema } from './exchange-rates';

describe('usdRateQuerySchema', () => {
  it('usa el dólar oficial si no se indica el tipo', () => {
    expect(usdRateQuerySchema.parse({})).toEqual({ type: 'oficial' });
  });

  it('acepta todos los tipos de dólar conocidos', () => {
    for (const type of USD_RATE_TYPES) {
      expect(usdRateQuerySchema.parse({ type })).toEqual({ type });
    }
  });

  it('rechaza un tipo desconocido', () => {
    expect(usdRateQuerySchema.safeParse({ type: 'inventado' }).success).toBe(false);
  });
});
