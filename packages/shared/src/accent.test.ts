import { describe, expect, it } from 'vitest';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_COLOR,
  MIN_ACCENT_CONTRAST,
  contrastWithWhite,
  isReadableAccent,
  relativeLuminance,
} from './accent';

describe('contraste', () => {
  it('el negro y el blanco son los extremos', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 5);
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 5);
  });

  it('un gris medio queda en el límite conocido (#767676 ≈ 4,5:1)', () => {
    expect(contrastWithWhite('#767676')).toBeGreaterThan(4.5);
    expect(contrastWithWhite('#777777')).toBeLessThan(4.6);
  });
});

describe('isReadableAccent', () => {
  it('acepta colores oscuros', () => {
    expect(isReadableAccent('#4a2b8a')).toBe(true);
    expect(isReadableAccent('#1d4ed8')).toBe(true);
  });

  it('rechaza colores demasiado claros para llevar texto blanco', () => {
    expect(isReadableAccent('#ffff00')).toBe(false);
    expect(isReadableAccent('#a5b4fc')).toBe(false);
  });

  it('rechaza lo que no es un #rrggbb', () => {
    expect(isReadableAccent('4a2b8a')).toBe(false);
    expect(isReadableAccent('#fff')).toBe(false);
    expect(isReadableAccent('rojo')).toBe(false);
    expect(isReadableAccent('')).toBe(false);
  });

  it('acepta mayúsculas', () => {
    expect(isReadableAccent('#4A2B8A')).toBe(true);
  });
});

describe('ACCENT_PRESETS', () => {
  it('el primero es el color por defecto', () => {
    expect(ACCENT_PRESETS[0]?.value).toBe(DEFAULT_ACCENT_COLOR);
  });

  it('todos los colores sugeridos se leen con texto blanco', () => {
    for (const preset of ACCENT_PRESETS) {
      expect(contrastWithWhite(preset.value), preset.name).toBeGreaterThanOrEqual(
        MIN_ACCENT_CONTRAST,
      );
    }
  });

  it('no repite colores ni nombres', () => {
    expect(new Set(ACCENT_PRESETS.map((preset) => preset.value)).size).toBe(ACCENT_PRESETS.length);
    expect(new Set(ACCENT_PRESETS.map((preset) => preset.name)).size).toBe(ACCENT_PRESETS.length);
  });
});
