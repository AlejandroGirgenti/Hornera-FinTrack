import { describe, expect, it } from 'vitest';
import { DELETE_CONFIRMATION_WORD, isDeleteConfirmed } from './delete-confirmation';

describe('isDeleteConfirmed', () => {
  it('acepta la palabra de confirmación sin importar mayúsculas ni espacios', () => {
    expect(isDeleteConfirmed(DELETE_CONFIRMATION_WORD)).toBe(true);
    expect(isDeleteConfirmed('eliminar')).toBe(true);
    expect(isDeleteConfirmed('  Eliminar ')).toBe(true);
  });

  it('rechaza cualquier otra cosa', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('eliminar cuenta')).toBe(false);
    expect(isDeleteConfirmed('ELIMINA')).toBe(false);
  });
});
