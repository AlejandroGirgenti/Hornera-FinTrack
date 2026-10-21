import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../lib/errors';

/**
 * Valida (y normaliza) el cuerpo de la petición con un esquema Zod.
 * Si es inválido responde 400 con el detalle por campo.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(badRequest('VALIDATION_ERROR', 'Los datos enviados no son válidos', details));
    }
    req.body = result.data;
    next();
  };
}
