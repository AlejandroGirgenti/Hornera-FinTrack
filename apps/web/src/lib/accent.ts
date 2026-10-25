import { isReadableAccent } from '@fintrack/shared';

export const ACCENT_STORAGE_KEY = 'fintrack-accent';

/**
 * Aplica el color de acento a toda la interfaz: solo cambia la variable --accent, y la escala
 * completa de tonos (accent-50 a accent-950) se recalcula en index.css. Con `null` (o un color
 * inválido) vuelve al color por defecto. Se guarda en el navegador para que la próxima carga
 * pinte el color correcto desde el primer momento, sin un destello del color por defecto
 * (ver el script de index.html).
 */
export function applyAccent(color: string | null) {
  const root = document.documentElement;
  const valid = color !== null && isReadableAccent(color);

  if (valid) root.style.setProperty('--accent', color.toLowerCase());
  else root.style.removeProperty('--accent');

  try {
    if (valid) localStorage.setItem(ACCENT_STORAGE_KEY, color.toLowerCase());
    else localStorage.removeItem(ACCENT_STORAGE_KEY);
  } catch {
    // localStorage puede estar bloqueado: el color igual se aplica en esta sesión
  }
}
