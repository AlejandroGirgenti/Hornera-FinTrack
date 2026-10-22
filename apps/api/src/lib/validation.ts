import type { ZodType } from 'zod';
import { badRequest } from './errors';

/**
 * Valida los parámetros de la URL (query string) con un esquema Zod y devuelve los datos ya
 * convertidos. Si son inválidos lanza un 400 con el detalle por campo.
 */
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw badRequest('VALIDATION_ERROR', 'Los parámetros enviados no son válidos', details);
  }
  return result.data;
}
