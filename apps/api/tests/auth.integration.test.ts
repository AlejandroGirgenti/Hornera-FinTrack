/**
 * Tests de integración de la API de autenticación (Supertest + PostgreSQL real).
 *
 * Requieren la base de test con las migraciones aplicadas:
 *   pnpm db:up
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack_test \
 *     pnpm --filter @fintrack/api exec prisma migrate deploy
 *
 * Si la base no responde, el archivo se saltea con un aviso (en el CI siempre hay base).
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { DEFAULT_CATEGORIES } from '../src/modules/auth/default-categories';

async function databaseIsUp() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const dbUp = await databaseIsUp();
if (!dbUp) {
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de integración.');
}

const app = createApp();
const API = '/api/v1/auth';
const COOKIE = 'refresh_token';

const ana = { name: 'Ana Pérez', email: 'ana@example.com', password: 'Segura123' };

/** Devuelve la cabecera Set-Cookie completa del refresh token. */
function setCookieOf(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? (raw as string[]) : [];
  const found = cookies.find((cookie) => cookie.startsWith(`${COOKIE}=`));
  if (!found) throw new Error('La respuesta no trajo la cookie del refresh token');
  return found;
}

/** Solo el par nombre=valor, tal como lo enviaría el navegador en la cabecera Cookie. */
const cookiePair = (setCookie: string) => setCookie.split(';')[0] as string;

async function registerAna() {
  const res = await request(app).post(`${API}/register`).send(ana);
  return { res, cookie: cookiePair(setCookieOf(res)), accessToken: res.body.accessToken as string };
}

describe.skipIf(!dbUp)('API de autenticación', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // borra en cascada categorías y refresh tokens
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('informa que la API y la base están arriba', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', db: 'up' });
    });
  });

  describe('POST /register', () => {
    it('crea la cuenta, las categorías por defecto y devuelve la sesión', async () => {
      const { res } = await registerAna();

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: ana.email,
        name: ana.name,
        baseCurrency: 'ARS',
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(typeof res.body.accessToken).toBe('string');

      const user = await prisma.user.findUniqueOrThrow({ where: { email: ana.email } });
      expect(user.passwordHash).not.toContain(ana.password);
      expect(await prisma.category.count({ where: { userId: user.id } })).toBe(
        DEFAULT_CATEGORIES.length,
      );
    });

    it('entrega el refresh token en una cookie httpOnly y guarda solo su hash', async () => {
      const { res, cookie } = await registerAna();
      const setCookie = setCookieOf(res);

      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/api/v1/auth');
      expect(setCookie).toContain('SameSite=Lax'); // en producción es None; Secure

      const rawToken = cookie.slice(`${COOKIE}=`.length);
      const stored = await prisma.refreshToken.findMany();
      expect(stored).toHaveLength(1);
      expect(stored[0]?.tokenHash).not.toBe(rawToken);
    });

    it('rechaza un email repetido sin distinguir mayúsculas (409)', async () => {
      await registerAna();
      const res = await request(app)
        .post(`${API}/register`)
        .send({ ...ana, email: 'ANA@Example.com' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('valida los datos de entrada (400 con detalle por campo)', async () => {
      const res = await request(app)
        .post(`${API}/register`)
        .send({ name: 'A', email: 'no-es-email', password: 'corta' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = (res.body.error.details as { field: string }[]).map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    });

    it('responde 400 ante un JSON mal formado', async () => {
      const res = await request(app)
        .post(`${API}/register`)
        .set('Content-Type', 'application/json')
        .send('{"email": ');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('POST /login', () => {
    it('inicia sesión con credenciales correctas', async () => {
      await registerAna();
      const res = await request(app)
        .post(`${API}/login`)
        .send({ email: 'ANA@example.com', password: ana.password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(ana.email);
      expect(typeof res.body.accessToken).toBe('string');
      expect(setCookieOf(res)).toContain('HttpOnly');
    });

    it('da el mismo error si la contraseña es incorrecta o el email no existe', async () => {
      await registerAna();

      const wrongPassword = await request(app)
        .post(`${API}/login`)
        .send({ email: ana.email, password: 'Incorrecta1' });
      const unknownEmail = await request(app)
        .post(`${API}/login`)
        .send({ email: 'nadie@example.com', password: 'Incorrecta1' });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(unknownEmail.body.error).toEqual(wrongPassword.body.error);
    });
  });

  describe('GET /me', () => {
    it('exige un access token', async () => {
      const res = await request(app).get(`${API}/me`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_ACCESS_TOKEN');
    });

    it('rechaza un token inválido', async () => {
      const res = await request(app).get(`${API}/me`).set('Authorization', 'Bearer basura');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_ACCESS_TOKEN');
    });

    it('devuelve el usuario autenticado', async () => {
      const { accessToken } = await registerAna();
      const res = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(ana.email);
    });
  });

  describe('POST /refresh', () => {
    it('rota el refresh token y emite un access token válido', async () => {
      const { cookie: first } = await registerAna();

      const res = await request(app).post(`${API}/refresh`).set('Cookie', first);
      expect(res.status).toBe(200);

      const second = cookiePair(setCookieOf(res));
      expect(second).not.toBe(first);

      const me = await request(app)
        .get(`${API}/me`)
        .set('Authorization', `Bearer ${res.body.accessToken}`);
      expect(me.status).toBe(200);
    });

    it('detecta la reutilización de un token ya rotado y revoca todas las sesiones', async () => {
      const { cookie: first } = await registerAna();

      const rotated = await request(app).post(`${API}/refresh`).set('Cookie', first);
      const second = cookiePair(setCookieOf(rotated));

      // Alguien presenta de nuevo el token viejo
      const replay = await request(app).post(`${API}/refresh`).set('Cookie', first);
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('REFRESH_TOKEN_REUSED');

      // Y la sesión legítima que había rotado también queda invalidada
      const legit = await request(app).post(`${API}/refresh`).set('Cookie', second);
      expect(legit.status).toBe(401);
    });

    it('rechaza la petición si no hay cookie', async () => {
      const res = await request(app).post(`${API}/refresh`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('rechaza un refresh token vencido', async () => {
      const { cookie } = await registerAna();
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      const res = await request(app).post(`${API}/refresh`).set('Cookie', cookie);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('REFRESH_TOKEN_EXPIRED');
    });
  });

  describe('POST /logout', () => {
    it('revoca el refresh token y borra la cookie', async () => {
      const { cookie } = await registerAna();

      const res = await request(app).post(`${API}/logout`).set('Cookie', cookie);
      expect(res.status).toBe(204);
      expect(setCookieOf(res)).toMatch(/refresh_token=;/);

      const after = await request(app).post(`${API}/refresh`).set('Cookie', cookie);
      expect(after.status).toBe(401);
    });

    it('es idempotente: responde 204 aunque no haya sesión', async () => {
      const res = await request(app).post(`${API}/logout`);
      expect(res.status).toBe(204);
    });
  });

  describe('rutas inexistentes', () => {
    it('responden 404 con el formato uniforme de error', async () => {
      const res = await request(app).get('/api/v1/no-existe');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
