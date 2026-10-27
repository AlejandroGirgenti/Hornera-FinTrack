import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatCompact,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatShortDate,
} from './format';

// Intl separa símbolo y número con un espacio no cortable (U+00A0): se normaliza para comparar
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

describe('formatDate', () => {
  it('incluye el año y no desfasa la fecha', () => {
    expect(formatDate('2026-10-23')).toBe('23 oct 2026');
    expect(formatDate('2027-01-01')).toBe('1 ene 2027');
  });
});

describe('formatDateTime', () => {
  it('muestra la hora de Buenos Aires, no la de UTC', () => {
    expect(formatDateTime('2026-10-22T18:00:00.000Z')).toBe('22 oct, 15:00');
    expect(formatDateTime('2026-10-23T02:30:00.000Z')).toBe('22 oct, 23:30');
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

describe('formatAmount', () => {
  it('omite los decimales cuando el monto es entero', () => {
    expect(normalize(formatAmount('200000.00'))).toBe('$ 200.000');
    expect(normalize(formatAmount(0))).toBe('$ 0');
  });

  it('los muestra cuando el monto los tiene', () => {
    expect(normalize(formatAmount('1500.5'))).toBe('$ 1.500,50');
  });

  it('respeta la moneda', () => {
    expect(normalize(formatAmount('150', 'USD'))).toContain('150');
    expect(formatAmount('150', 'USD')).not.toBe(formatAmount('150', 'ARS'));
  });
});
