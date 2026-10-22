import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { apiLimiter } from './middlewares/rate-limit';
import { requestLogger } from './middlewares/request-logger';
import { authRouter } from './modules/auth/auth.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { transactionsRouter } from './modules/transactions/transactions.router';
import { reportsRouter } from './modules/reports/reports.router';

/**
 * Arma la aplicación Express sin ponerla a escuchar.
 * Separarla de server.ts permite testearla con Supertest sin abrir un puerto.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Detrás del proxy del hosting (Render, Railway…) hace falta para ver la IP real del cliente
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/transactions', transactionsRouter);
  app.use('/api/v1/reports', reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
