import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACCENT_STORAGE_KEY, applyAccent } from './accent';

function stubBrowser() {
  const store = new Map<string, string>();
  const style = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        setProperty: (name: string, value: string) => void style.set(name, value),
        removeProperty: (name: string) => void style.delete(name),
      },
    },
  });
  return { store, style };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('applyAccent', () => {
  it('cambia la variable --accent y guarda el color en minúsculas', () => {
    const { store, style } = stubBrowser();
    applyAccent('#1D4ED8');
    expect(style.get('--accent')).toBe('#1d4ed8');
    expect(store.get(ACCENT_STORAGE_KEY)).toBe('#1d4ed8');
  });

  it('con null vuelve al color por defecto y borra lo guardado', () => {
    const { store, style } = stubBrowser();
    applyAccent('#1d4ed8');
    applyAccent(null);
    expect(style.has('--accent')).toBe(false);
    expect(store.has(ACCENT_STORAGE_KEY)).toBe(false);
  });

  it('ignora colores inválidos o demasiado claros', () => {
    const { store, style } = stubBrowser();
    applyAccent('#ffff00');
    applyAccent('violeta');
    expect(style.has('--accent')).toBe(false);
    expect(store.has(ACCENT_STORAGE_KEY)).toBe(false);
  });
});
