import { describe, expect, it } from 'vitest';
import { addMonths, monthRange, monthsBack, resolvePeriod, todayInBuenosAires } from './dates';

describe('todayInBuenosAires', () => {
  it('usa la fecha de Buenos Aires (UTC-3), no la de UTC', () => {
    // 23:30 del 30/10 en Buenos Aires ya es 02:30 del 31/10 en UTC
    expect(todayInBuenosAires(new Date('2026-10-31T02:30:00Z'))).toBe('2026-10-30');
    // 03:00 UTC es medianoche en Buenos Aires: ya cambió el día
    expect(todayInBuenosAires(new Date('2026-10-31T03:00:00Z'))).toBe('2026-10-31');
  });

  it('a fin de mes no se adelanta al mes siguiente', () => {
    // 22:00 del 31/10 en Buenos Aires es 01:00 del 1/11 en UTC
    expect(todayInBuenosAires(new Date('2026-11-01T01:00:00Z'))).toBe('2026-10-31');
  });

  it('a fin de año tampoco se adelanta al año siguiente', () => {
    expect(todayInBuenosAires(new Date('2027-01-01T02:00:00Z'))).toBe('2026-12-31');
  });
});

describe('monthRange', () => {
  it('devuelve el primer y el último día del mes', () => {
    expect(monthRange('2026-10-18')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-04-01')).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(monthRange('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('respeta los años bisiestos', () => {
    expect(monthRange('2028-02-10').to).toBe('2028-02-29');
    expect(monthRange('2027-02-10').to).toBe('2027-02-28');
  });
});

describe('addMonths y monthsBack', () => {
  it('suma y resta meses cruzando el cambio de año', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', -12)).toBe('2025-10');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });

  it('lista los últimos meses del más viejo al más nuevo', () => {
    expect(monthsBack('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthsBack('2026-10', 1)).toEqual(['2026-10']);
  });
});

describe('resolvePeriod', () => {
  it('respeta el período pedido', () => {
    expect(resolvePeriod('2026-09-01', '2026-10-15')).toEqual({
      from: '2026-09-01',
      to: '2026-10-15',
    });
  });

  it('usa el mes en curso en Buenos Aires cuando no se indica', () => {
    const now = new Date('2026-11-01T01:00:00Z'); // todavía es 31/10 en Buenos Aires
    expect(resolvePeriod(undefined, undefined, now)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });
});
