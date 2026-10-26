import { COUNTRY_CODES } from '@fintrack/shared';
import { describe, expect, it } from 'vitest';
import { countryName, countryOptions } from './countries';

describe('countryOptions', () => {
  it('trae todos los países con su nombre en español', () => {
    const options = countryOptions();
    expect(options).toHaveLength(COUNTRY_CODES.length);
    expect(options.find((option) => option.value === 'AR')?.label).toBe('Argentina');
    expect(options.find((option) => option.value === 'US')?.label).toBe('Estados Unidos');
  });

  it('está ordenado alfabéticamente por nombre', () => {
    const labels = countryOptions().map((option) => option.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'es'));
    expect(labels).toEqual(sorted);
  });
});

describe('countryName', () => {
  it('devuelve el nombre, o nada si no hay país', () => {
    expect(countryName('UY')).toBe('Uruguay');
    expect(countryName(null)).toBeNull();
    expect(countryName('')).toBeNull();
  });

  it('si el código no se reconoce, lo devuelve tal cual', () => {
    expect(countryName('ZZ')).toBe('ZZ');
  });
});
