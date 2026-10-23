import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, getInitialTheme } from './theme';

function stubBrowser({ stored, prefersDark }: { stored?: string; prefersDark: boolean }) {
  const store = new Map<string, string>(stored ? [[THEME_STORAGE_KEY, stored]] : []);
  const classes = new Set<string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: prefersDark }) });
  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (name: string, force: boolean) =>
          force ? classes.add(name) : classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
    },
  });
  return { store, classes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getInitialTheme', () => {
  it('prefiere la elección guardada sobre la del sistema', () => {
    stubBrowser({ stored: 'light', prefersDark: true });
    expect(getInitialTheme()).toBe('light');
  });

  it('sin elección guardada sigue al sistema operativo', () => {
    stubBrowser({ prefersDark: true });
    expect(getInitialTheme()).toBe('dark');
    stubBrowser({ prefersDark: false });
    expect(getInitialTheme()).toBe('light');
  });

  it('ignora valores guardados inválidos', () => {
    stubBrowser({ stored: 'violeta', prefersDark: false });
    expect(getInitialTheme()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('agrega la clase "dark" y guarda la preferencia', () => {
    const { store, classes } = stubBrowser({ prefersDark: false });
    applyTheme('dark');
    expect(classes.has('dark')).toBe(true);
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');

    applyTheme('light');
    expect(classes.has('dark')).toBe(false);
    expect(store.get(THEME_STORAGE_KEY)).toBe('light');
  });
});
