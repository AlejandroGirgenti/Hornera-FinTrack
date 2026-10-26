import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, DEFAULT_COUNTRY, countrySchema } from './countries';

describe('países', () => {
  it('son códigos ISO de dos letras mayúsculas, sin repetir', () => {
    expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
  });

  it('incluyen Argentina, que es el país por defecto', () => {
    expect(COUNTRY_CODES).toContain(DEFAULT_COUNTRY);
    expect(DEFAULT_COUNTRY).toBe('AR');
  });

  it('el esquema acepta un código válido y rechaza el resto', () => {
    expect(countrySchema.safeParse('UY').success).toBe(true);
    expect(countrySchema.safeParse('ar').success).toBe(false);
    expect(countrySchema.safeParse('ZZ').success).toBe(false);
    expect(countrySchema.safeParse('').success).toBe(false);
  });
});
