import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

/** Asigna un id a cada petición y registra método, ruta, estado y duración al terminar. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        userId: req.userId,
      },
      'request',
    );
  });

  next();
}
