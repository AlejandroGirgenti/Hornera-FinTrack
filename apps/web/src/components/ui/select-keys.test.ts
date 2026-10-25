import { describe, expect, it } from 'vitest';
import { findByInitial, nextIndex } from './select-keys';

describe('nextIndex', () => {
  it('baja y sube sin pasarse de los extremos', () => {
    expect(nextIndex(0, 'ArrowDown', 3)).toBe(1);
    expect(nextIndex(2, 'ArrowDown', 3)).toBe(2);
    expect(nextIndex(1, 'ArrowUp', 3)).toBe(0);
    expect(nextIndex(0, 'ArrowUp', 3)).toBe(0);
  });

  it('Inicio y Fin saltan al primero y al último', () => {
    expect(nextIndex(1, 'Home', 4)).toBe(0);
    expect(nextIndex(1, 'End', 4)).toBe(3);
  });

  it('sin opciones no hay ninguna activa', () => {
    expect(nextIndex(0, 'ArrowDown', 0)).toBe(-1);
  });

  it('ignora otras teclas', () => {
    expect(nextIndex(1, 'a', 3)).toBe(1);
  });
});

describe('findByInitial', () => {
  const labels = ['Comida', 'Transporte', 'Casa', 'Salud'];

  it('busca desde la opción siguiente a la activa', () => {
    expect(findByInitial(labels, 'c', 0)).toBe(2);
  });

  it('vuelve al principio si no hay más adelante', () => {
    expect(findByInitial(labels, 'c', 2)).toBe(0);
  });

  it('no distingue mayúsculas y devuelve -1 si nada coincide', () => {
    expect(findByInitial(labels, 'S', 0)).toBe(3);
    expect(findByInitial(labels, 'z', 0)).toBe(-1);
  });
});
