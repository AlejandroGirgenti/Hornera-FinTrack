import { DEFAULT_CATEGORY_COLOR } from '@fintrack/shared';

/** Paleta sugerida (tonos 500 de Tailwind): se distinguen bien entre sí en los gráficos. */
export const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
] as const;

/**
 * Color para una categoría nueva: el primero de la paleta que todavía no usa ninguna, así las
 * porciones del gráfico no se confunden. Si ya se usaron todos, vuelve al color por defecto.
 */
export function suggestColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((color) => color.toLowerCase()));
  return CATEGORY_COLORS.find((color) => !used.has(color)) ?? DEFAULT_CATEGORY_COLOR;
}
