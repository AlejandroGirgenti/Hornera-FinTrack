import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /** Uno o varios orígenes permitidos, separados por coma. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Solo para sobrescribir el valor por defecto según el entorno. */
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Variables de entorno inválidas:\n${problems}`);
    process.exit(1);
  }
  return parsed.data;
}

const raw = loadEnv();
const isProduction = raw.NODE_ENV === 'production';

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /**
   * En producción el frontend y la API suelen estar en dominios distintos, por eso la cookie
   * del refresh token usa SameSite=None; Secure. En desarrollo (http://localhost) alcanza con Lax.
   */
  cookie: {
    secure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === 'true' : isProduction,
    sameSite: raw.COOKIE_SAMESITE ?? (isProduction ? ('none' as const) : ('lax' as const)),
  },
};

export type Env = typeof env;
