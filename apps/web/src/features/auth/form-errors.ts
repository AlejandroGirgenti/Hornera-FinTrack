import { ApiError } from '../../lib/api';

/** Mensaje de error por nombre de campo. */
export type FieldErrors = Partial<Record<string, string>>;

interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
}

/** Toma el primer error de cada campo de un resultado de validación de Zod. */
export function fromIssues(issues: readonly IssueLike[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/**
 * Traduce un error de la API a mensajes para el formulario: si el servidor devolvió errores por
 * campo (VALIDATION_ERROR) se muestran junto a cada campo; si no, como mensaje general.
 */
export function fromApiError(error: unknown): {
  fieldErrors: FieldErrors;
  formError: string | null;
} {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
      const issues = (error.details as { field?: string; message?: string }[]).flatMap((detail) =>
        detail.field && detail.message ? [{ path: [detail.field], message: detail.message }] : [],
      );
      const fieldErrors = fromIssues(issues);
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null };
    }
    return { fieldErrors: {}, formError: error.message };
  }
  return { fieldErrors: {}, formError: 'No se pudo conectar con el servidor. Probá de nuevo.' };
}
