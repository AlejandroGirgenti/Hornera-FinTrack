import { describe, expect, it } from 'vitest';
import { addMonths, currentMonth, formatMonthLabel, formatMonthShort, monthRange } from './dates';

describe('currentMonth', () => {
  it('usa la fecha de Buenos Aires, no la de UTC', () => {
    // 1 de noviembre 01:30 UTC = 31 de octubre 22:30 en Buenos Aires (UTC-3)
    expect(currentMonth(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10');
  });

  it('pasa al mes siguiente cuando ya es medianoche en Buenos Aires', () => {
    expect(currentMonth(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11');
  });
});

describe('addMonths', () => {
  it('suma y resta meses', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-10', -3)).toBe('2026-07');
  });

  it('cruza el límite de año en ambos sentidos', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -15)).toBe('2024-12');
  });
});

describe('monthRange', () => {
  it('devuelve el primer y el último día del mes', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('respeta los años bisiestos', () => {
    expect(monthRange('2028-02').to).toBe('2028-02-29');
    expect(monthRange('2027-02').to).toBe('2027-02-28');
  });
});

describe('formatMonthLabel / formatMonthShort', () => {
  it('formatea en español', () => {
    expect(formatMonthLabel('2026-10')).toBe('octubre de 2026');
    expect(formatMonthShort('2026-10')).toBe('oct');
    expect(formatMonthShort('2026-09')).toBe('sept');
  });
});
