import { describe, expect, it } from 'vitest';
import { CATEGORY_COLORS, suggestColor } from './colors';

describe('suggestColor', () => {
  it('sin categorías propone el primer color de la paleta', () => {
    expect(suggestColor([])).toBe(CATEGORY_COLORS[0]);
  });

  it('salta los colores que ya se usan, sin distinguir mayúsculas', () => {
    expect(suggestColor([CATEGORY_COLORS[0].toUpperCase(), CATEGORY_COLORS[1]])).toBe(
      CATEGORY_COLORS[2],
    );
  });

  it('ignora colores que no son de la paleta', () => {
    expect(suggestColor(['#123456'])).toBe(CATEGORY_COLORS[0]);
  });

  it('si se usaron todos vuelve al color por defecto', () => {
    expect(suggestColor(CATEGORY_COLORS)).toBe('#6366f1');
  });
});
