export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fintrack-theme';

/** Tema guardado por la persona; si nunca eligió, el del sistema operativo. */
export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage puede estar bloqueado (modo privado): se sigue con el tema del sistema
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // no se pudo guardar la preferencia: el cambio igual se aplica en esta sesión
  }
}
