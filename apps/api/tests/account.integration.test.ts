/**
 * Tests de integración de la cuenta: país en el registro, datos personales, cambio de correo y
 * contraseña, borrado de cuenta y recuperar contraseña.
 * Se omiten con un aviso si la base de test no responde.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { testOutbox } from '../src/lib/mailer';

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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de cuenta.');
}

const app = createApp();
const AUTH = '/api/v1/auth';
const COOKIE = 'refresh_token';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const PASSWORD = 'Segura123';

/** El par nombre=valor de la cookie del refresh token, como lo enviaría el navegador. */
function refreshCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? (raw as string[]) : [];
  const found = cookies.find((cookie) => cookie.startsWith(`${COOKIE}=`));
  if (!found) throw new Error('La respuesta no trajo la cookie del refresh token');
  return found.split(';')[0] as string;
}

async function signUp(email: string, extra: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`${AUTH}/register`)
    .send({ name: 'Usuario Test', email, password: PASSWORD, ...extra });
  return {
    res,
    token: res.body.accessToken as string,
    cookie: res.status === 201 ? refreshCookie(res) : '',
    userId: res.body.user?.id as string,
  };
}

const loginWith = (email: string, password: string) =>
  request(app).post(`${AUTH}/login`).send({ email, password });

describe.skipIf(!dbUp)('Cuenta y datos personales', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    testOutbox.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('registro con país', () => {
    it('guarda el país elegido', async () => {
      const { res } = await signUp('uy@example.com', { country: 'UY' });
      expect(res.status).toBe(201);
      expect(res.body.user.country).toBe('UY');
    });

    it('lo deja vacío si no se manda', async () => {
      const { res } = await signUp('sin-pais@example.com');
      expect(res.status).toBe(201);
      expect(res.body.user.country).toBeNull();
    });

    it('rechaza un país que no existe', async () => {
      const { res } = await signUp('mal@example.com', { country: 'Argentina' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /auth/me (datos personales)', () => {
    it('cambia el nombre y el país, y se ve en GET /me', async () => {
      const { token } = await signUp('datos@example.com');
      const res = await request(app)
        .patch(`${AUTH}/me`)
        .set(bearer(token))
        .send({ name: 'Ana María', country: 'CL' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ name: 'Ana María', country: 'CL' });

      const me = await request(app).get(`${AUTH}/me`).set(bearer(token));
      expect(me.body.user).toMatchObject({ name: 'Ana María', country: 'CL' });
    });

    it('cambia la moneda base mientras no haya movimientos', async () => {
      const { token } = await signUp('moneda@example.com');
      const res = await request(app)
        .patch(`${AUTH}/me`)
        .set(bearer(token))
        .send({ baseCurrency: 'USD' });
      expect(res.status).toBe(200);
      expect(res.body.user.baseCurrency).toBe('USD');
    });

    it('no deja cambiar la moneda base si ya hay movimientos', async () => {
      const { token } = await signUp('bloqueo@example.com');
      const categories = await request(app).get('/api/v1/categories').set(bearer(token));
      const expense = (categories.body.data as { id: string; type: string }[]).find(
        (category) => category.type === 'EXPENSE',
      );
      const created = await request(app)
        .post('/api/v1/transactions')
        .set(bearer(token))
        .send({ type: 'EXPENSE', amount: 1000, date: '2026-10-10', categoryId: expense?.id });
      expect(created.status).toBe(201);

      const res = await request(app)
        .patch(`${AUTH}/me`)
        .set(bearer(token))
        .send({ baseCurrency: 'USD' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BASE_CURRENCY_LOCKED');

      // Mandar la misma moneda que ya tiene no es un cambio y se acepta
      const same = await request(app)
        .patch(`${AUTH}/me`)
        .set(bearer(token))
        .send({ baseCurrency: 'ARS' });
      expect(same.status).toBe(200);
    });

    it('no acepta cambiar el correo por acá ni un pedido vacío', async () => {
      const { token } = await signUp('estricto@example.com');
      const withEmail = await request(app)
        .patch(`${AUTH}/me`)
        .set(bearer(token))
        .send({ email: 'otro@example.com' });
      expect(withEmail.status).toBe(400);
      const empty = await request(app).patch(`${AUTH}/me`).set(bearer(token)).send({});
      expect(empty.status).toBe(400);
    });
  });

  describe('PATCH /auth/me/email', () => {
    it('exige sesión', async () => {
      const res = await request(app)
        .patch(`${AUTH}/me/email`)
        .send({ email: 'nuevo@example.com', currentPassword: PASSWORD });
      expect(res.status).toBe(401);
    });

    it('rechaza una contraseña incorrecta, indicando el campo', async () => {
      const { token } = await signUp('correo1@example.com');
      const res = await request(app)
        .patch(`${AUTH}/me/email`)
        .set(bearer(token))
        .send({ email: 'nuevo@example.com', currentPassword: 'Equivocada1' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('currentPassword');
    });

    it('cambia el correo (normalizado) y permite entrar con el nuevo', async () => {
      const { token } = await signUp('correo2@example.com');
      const res = await request(app)
        .patch(`${AUTH}/me/email`)
        .set(bearer(token))
        .send({ email: '  Nuevo2@Example.com ', currentPassword: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('nuevo2@example.com');

      expect((await loginWith('nuevo2@example.com', PASSWORD)).status).toBe(200);
      expect((await loginWith('correo2@example.com', PASSWORD)).status).toBe(401);
    });

    it('rechaza un correo que ya usa otra cuenta', async () => {
      await signUp('ocupado@example.com');
      const { token } = await signUp('correo3@example.com');
      const res = await request(app)
        .patch(`${AUTH}/me/email`)
        .set(bearer(token))
        .send({ email: 'ocupado@example.com', currentPassword: PASSWORD });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('PUT /auth/me/password', () => {
    it('rechaza la contraseña actual incorrecta', async () => {
      const { token, cookie } = await signUp('clave1@example.com');
      const res = await request(app)
        .put(`${AUTH}/me/password`)
        .set(bearer(token))
        .set('Cookie', cookie)
        .send({ currentPassword: 'Equivocada1', newPassword: 'Nueva12345' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('currentPassword');
    });

    it('valida la nueva contraseña y que sea distinta de la actual', async () => {
      const { token, cookie } = await signUp('clave2@example.com');
      const weak = await request(app)
        .put(`${AUTH}/me/password`)
        .set(bearer(token))
        .set('Cookie', cookie)
        .send({ currentPassword: PASSWORD, newPassword: 'corta' });
      expect(weak.status).toBe(400);
      const same = await request(app)
        .put(`${AUTH}/me/password`)
        .set(bearer(token))
        .set('Cookie', cookie)
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
      expect(same.status).toBe(400);
    });

    it('cambia la contraseña y cierra las demás sesiones, pero no la actual', async () => {
      const email = 'clave3@example.com';
      const { token, cookie } = await signUp(email);
      const other = await loginWith(email, PASSWORD); // otra sesión abierta (otro dispositivo)
      const otherCookie = refreshCookie(other);

      const res = await request(app)
        .put(`${AUTH}/me/password`)
        .set(bearer(token))
        .set('Cookie', cookie)
        .send({ currentPassword: PASSWORD, newPassword: 'Nueva12345' });
      expect(res.status).toBe(204);

      expect((await loginWith(email, PASSWORD)).status).toBe(401);
      expect((await loginWith(email, 'Nueva12345')).status).toBe(200);

      // La otra sesión quedó cerrada y la actual sigue funcionando
      expect((await request(app).post(`${AUTH}/refresh`).set('Cookie', otherCookie)).status).toBe(
        401,
      );
      expect((await request(app).post(`${AUTH}/refresh`).set('Cookie', cookie)).status).toBe(200);
    });
  });

  describe('DELETE /auth/me', () => {
    it('exige la contraseña correcta', async () => {
      const { token } = await signUp('borrar1@example.com');
      const res = await request(app)
        .delete(`${AUTH}/me`)
        .set(bearer(token))
        .send({ password: 'Equivocada1' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('password');
      expect(await prisma.user.count()).toBe(1);
    });

    it('borra la cuenta con todos sus datos y cierra la sesión', async () => {
      const mine = await signUp('borrar2@example.com');
      const theirs = await signUp('intacta@example.com');

      const categories = await request(app).get('/api/v1/categories').set(bearer(mine.token));
      const expense = (categories.body.data as { id: string; type: string }[]).find(
        (category) => category.type === 'EXPENSE',
      );
      await request(app)
        .post('/api/v1/transactions')
        .set(bearer(mine.token))
        .send({ type: 'EXPENSE', amount: 500, date: '2026-10-10', categoryId: expense?.id });

      const res = await request(app)
        .delete(`${AUTH}/me`)
        .set(bearer(mine.token))
        .send({ password: PASSWORD });
      expect(res.status).toBe(204);
      expect(String(res.headers['set-cookie'])).toContain(`${COOKIE}=;`);

      expect(await prisma.user.count({ where: { id: mine.userId } })).toBe(0);
      expect(await prisma.category.count({ where: { userId: mine.userId } })).toBe(0);
      expect(await prisma.transaction.count({ where: { userId: mine.userId } })).toBe(0);
      expect(await prisma.refreshToken.count({ where: { userId: mine.userId } })).toBe(0);

      expect((await request(app).get(`${AUTH}/me`).set(bearer(mine.token))).status).toBe(401);
      expect((await loginWith('borrar2@example.com', PASSWORD)).status).toBe(401);

      // La cuenta de otra persona no se toca
      expect(await prisma.category.count({ where: { userId: theirs.userId } })).toBeGreaterThan(0);
    });
  });

  describe('recuperar contraseña', () => {
    /** Pide el enlace y devuelve el token que viajó en el correo. */
    async function requestResetToken(email: string): Promise<string> {
      const res = await request(app).post(`${AUTH}/forgot-password`).send({ email });
      expect(res.status).toBe(202);
      const mail = testOutbox.at(-1);
      const token = /token=([\w-]+)/.exec(mail?.text ?? '')?.[1];
      if (!token) throw new Error('El correo no trajo el enlace con el token');
      return token;
    }

    it('responde igual si el email no tiene cuenta y no envía nada', async () => {
      const res = await request(app)
        .post(`${AUTH}/forgot-password`)
        .send({ email: 'nadie@example.com' });
      expect(res.status).toBe(202);
      expect(testOutbox).toHaveLength(0);
    });

    it('envía un correo con el enlace a quien tiene cuenta', async () => {
      await signUp('olvido1@example.com');
      await requestResetToken('olvido1@example.com');
      expect(testOutbox).toHaveLength(1);
      expect(testOutbox[0]?.to).toBe('olvido1@example.com');
      expect(testOutbox[0]?.text).toContain('/restablecer-contrasena?token=');
    });

    it('guarda el token hasheado, no en claro', async () => {
      const { userId } = await signUp('olvido2@example.com');
      const token = await requestResetToken('olvido2@example.com');
      const stored = await prisma.passwordResetToken.findMany({ where: { userId } });
      expect(stored).toHaveLength(1);
      expect(stored[0]?.tokenHash).not.toBe(token);
    });

    it('permite elegir una nueva contraseña una sola vez', async () => {
      const email = 'olvido3@example.com';
      await signUp(email);
      const token = await requestResetToken(email);

      const ok = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token, password: 'Nueva12345' });
      expect(ok.status).toBe(204);

      expect((await loginWith(email, PASSWORD)).status).toBe(401);
      expect((await loginWith(email, 'Nueva12345')).status).toBe(200);

      const again = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token, password: 'Otra123456' });
      expect(again.status).toBe(400);
      expect(again.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('cierra las sesiones que estaban abiertas', async () => {
      const email = 'olvido4@example.com';
      const { cookie } = await signUp(email);
      const token = await requestResetToken(email);
      await request(app).post(`${AUTH}/reset-password`).send({ token, password: 'Nueva12345' });
      expect((await request(app).post(`${AUTH}/refresh`).set('Cookie', cookie)).status).toBe(401);
    });

    it('rechaza un token inventado, uno vencido y una contraseña débil', async () => {
      const email = 'olvido5@example.com';
      const { userId } = await signUp(email);
      const token = await requestResetToken(email);

      const fake = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token: 'x'.repeat(43), password: 'Nueva12345' });
      expect(fake.status).toBe(400);
      expect(fake.body.error.code).toBe('INVALID_RESET_TOKEN');

      const weak = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token, password: 'corta' });
      expect(weak.status).toBe(400);
      expect(weak.body.error.code).toBe('VALIDATION_ERROR');

      await prisma.passwordResetToken.updateMany({
        where: { userId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expired = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token, password: 'Nueva12345' });
      expect(expired.status).toBe(400);
      expect(expired.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('un enlace nuevo invalida al anterior', async () => {
      const email = 'olvido6@example.com';
      await signUp(email);
      const first = await requestResetToken(email);
      const second = await requestResetToken(email);

      const old = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token: first, password: 'Nueva12345' });
      expect(old.status).toBe(400);
      const fresh = await request(app)
        .post(`${AUTH}/reset-password`)
        .send({ token: second, password: 'Nueva12345' });
      expect(fresh.status).toBe(204);
    });
  });
});
