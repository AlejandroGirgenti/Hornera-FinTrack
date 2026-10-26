/** Palabra que hay que escribir en el segundo paso para confirmar. */
export const DELETE_CONFIRMATION_WORD = 'ELIMINAR';

/** ¿Escribió la palabra de confirmación? No distingue mayúsculas ni espacios de los costados. */
export function isDeleteConfirmed(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_CONFIRMATION_WORD;
}
