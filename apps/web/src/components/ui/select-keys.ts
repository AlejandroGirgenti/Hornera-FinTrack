/** Navegación con el teclado de una lista de opciones (ver Select). */

/** Índice de la opción activa después de apretar una tecla de movimiento. */
export function nextIndex(current: number, key: string, count: number): number {
  if (count === 0) return -1;
  switch (key) {
    case 'ArrowDown':
      return Math.min(current + 1, count - 1);
    case 'ArrowUp':
      return current < 0 ? 0 : Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return current;
  }
}

/**
 * Primera opción cuyo texto empieza con la letra tipeada, buscando a partir de la siguiente a la
 * activa y volviendo al principio si hace falta. Devuelve -1 si ninguna coincide.
 */
export function findByInitial(labels: readonly string[], letter: string, from: number): number {
  const wanted = letter.toLowerCase();
  for (let step = 1; step <= labels.length; step += 1) {
    const index = (from + step + labels.length) % labels.length;
    if (labels[index]?.toLowerCase().startsWith(wanted)) return index;
  }
  return -1;
}
