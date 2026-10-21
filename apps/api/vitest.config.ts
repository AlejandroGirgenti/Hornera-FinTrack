import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Los tests de integración comparten la misma base de datos
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/fintrack_test',
      JWT_ACCESS_SECRET: 'secreto-solo-para-tests-0123456789-abcdef',
      ACCESS_TOKEN_TTL_MINUTES: '15',
      REFRESH_TOKEN_TTL_DAYS: '7',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
