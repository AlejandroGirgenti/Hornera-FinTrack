import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Apagando el servidor');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Si quedan conexiones colgadas, se fuerza el cierre
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
