import { describe, expect, it } from 'vitest';
import { normalizeNumberInput } from './amount-input';

describe('normalizeNumberInput', () => {
  it('acepta el formato argentino con coma decimal y puntos de miles', () => {
    expect(normalizeNumberInput('1.500,50')).toBe('1500.50');
    expect(normalizeNumberInput('1.234.567,8')).toBe('1234567.8');
    expect(normalizeNumberInput('45000,5')).toBe('45000.5');
  });

  it('acepta el punto como decimal', () => {
    expect(normalizeNumberInput('1500.5')).toBe('1500.5');
    expect(normalizeNumberInput('0.99')).toBe('0.99');
  });

  it('interpreta un punto seguido de 3 dígitos como separador de miles', () => {
    expect(normalizeNumberInput('1.500')).toBe('1500');
    expect(normalizeNumberInput('2.000.000')).toBe('2000000');
  });

  it('ignora espacios y el símbolo de moneda', () => {
    expect(normalizeNumberInput(' $ 2 000 ')).toBe('2000');
    expect(normalizeNumberInput('US$ 100')).toBe('100');
  });

  it('no arregla lo que no es un número: lo valida el esquema compartido', () => {
    expect(normalizeNumberInput('abc')).toBe('abc');
    expect(normalizeNumberInput('')).toBe('');
  });
});
