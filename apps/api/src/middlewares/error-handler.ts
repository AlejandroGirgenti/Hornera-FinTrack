import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@fintrack/shared';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body('NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.path}`));
};

// Express reconoce un manejador de errores por tener exactamente 4 parámetros.

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  // JSON mal formado o cuerpo demasiado grande (los lanza express.json)
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json(body('INVALID_JSON', 'El cuerpo de la petición no es un JSON válido'));
      return;
    }
    if (type === 'entity.too.large') {
      res
        .status(413)
        .json(body('PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande'));
      return;
    }
  }

  // Violación de restricción única (por ejemplo, una categoría duplicada)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json(body('CONFLICT', 'Ya existe un registro con esos datos'));
    return;
  }

  logger.error({ err, requestId: req.id }, 'Error no controlado');
  res.status(500).json(body('INTERNAL_ERROR', 'Ocurrió un error inesperado'));
};
