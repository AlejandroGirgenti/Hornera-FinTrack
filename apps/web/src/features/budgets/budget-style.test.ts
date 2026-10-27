import { describe, expect, it } from 'vitest';
import { barWidth, remainingText } from './budget-style';

const normalize = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('barWidth', () => {
  it('va de 0 a 100 y se queda en el tope si se pasó', () => {
    expect(barWidth(0)).toBe(0);
    expect(barWidth(42.5)).toBe(42.5);
    expect(barWidth(100)).toBe(100);
    expect(barWidth(121.7)).toBe(100);
  });

  it('sin porcentaje la barra está vacía', () => {
    expect(barWidth(null)).toBe(0);
    expect(barWidth(Number.NaN)).toBe(0);
    expect(barWidth(-5)).toBe(0);
  });
});

describe('remainingText', () => {
  it('dice cuánto queda', () => {
    expect(normalize(remainingText('50000.00', 'ARS'))).toBe('Te quedan $ 50.000');
    expect(normalize(remainingText('0.00', 'ARS'))).toBe('Te quedan $ 0');
  });

  it('dice cuánto se excedió', () => {
    expect(normalize(remainingText('-26000.00', 'ARS'))).toBe('Excedido por $ 26.000');
  });
});
