import { describe, expect, it } from 'vitest';
import { formatCompact, formatMoney, formatPercent, formatShortDate } from './format';

const normalize = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('formatMoney', () => {
  it('formatea pesos argentinos', () => {
    expect(normalize(formatMoney('45000.5'))).toBe('$ 45.000,50');
  });

  it('formatea dólares y negativos', () => {
    expect(normalize(formatMoney('1234.56', 'USD'))).toContain('1.234,56');
    expect(normalize(formatMoney('-1500'))).toContain('1.500,00');
    expect(formatMoney('-1500')).toContain('-');
  });
});

describe('formatShortDate', () => {
  it('no desfasa la fecha por zona horaria', () => {
    expect(formatShortDate('2026-10-01')).toBe('1 oct');
    expect(formatShortDate('2026-12-31')).toBe('31 dic');
  });
});

describe('formatCompact / formatPercent', () => {
  it('abrevia montos grandes', () => {
    expect(normalize(formatCompact(1_250_000))).toBe('1,3 M');
    expect(formatCompact(950)).toBe('950');
  });

  it('formatea porcentajes con coma decimal', () => {
    expect(normalize(formatPercent(12.5))).toBe('12,5 %');
    expect(normalize(formatPercent(100))).toBe('100 %');
  });
});
