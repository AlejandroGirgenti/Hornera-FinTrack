import { describe, expect, it } from 'vitest';
import { USD_RATE_TYPES } from '@fintrack/shared';
import { USD_RATE_LABELS, canAutoRate } from './exchange-rate';

describe('canAutoRate', () => {
  it('solo aplica a dólares cuando la moneda base es el peso', () => {
    expect(canAutoRate('ARS', 'USD')).toBe(true);
    expect(canAutoRate('ARS', 'ARS')).toBe(false);
    expect(canAutoRate('USD', 'ARS')).toBe(false);
    expect(canAutoRate('USD', 'USD')).toBe(false);
  });
});

describe('USD_RATE_LABELS', () => {
  it('tiene un nombre para cada tipo de dólar que ofrece la API', () => {
    for (const type of USD_RATE_TYPES) expect(USD_RATE_LABELS[type]).toBeTruthy();
  });
});
