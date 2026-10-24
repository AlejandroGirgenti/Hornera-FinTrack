import { describe, expect, it } from 'vitest';
import { EXPORT_FORMATS, exportFormatQuerySchema } from './transactions';

describe('exportFormatQuerySchema', () => {
  it('exporta en CSV si no se indica el formato', () => {
    expect(exportFormatQuerySchema.parse({})).toEqual({ format: 'csv' });
  });

  it('acepta los formatos conocidos', () => {
    for (const format of EXPORT_FORMATS) {
      expect(exportFormatQuerySchema.parse({ format })).toEqual({ format });
    }
  });

  it('rechaza un formato desconocido', () => {
    expect(exportFormatQuerySchema.safeParse({ format: 'pdf' }).success).toBe(false);
  });
});
