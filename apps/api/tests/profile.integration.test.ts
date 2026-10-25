/**
 * Tests de integración del perfil: color de acento (PATCH /auth/me).
 * Se omiten con un aviso si la base de test no responde.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de perfil.');
}

const app = createApp();
const ME = '/api/v1/auth/me';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function signUp(email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Usuario Test', email, password: 'Segura123' });
  return { token: res.body.accessToken as string, user: res.body.user };
}

describe.skipIf(!dbUp)('PATCH /auth/me (color de acento)', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exige sesión', async () => {
    const res = await request(app).patch(ME).send({ accentColor: '#4a2b8a' });
    expect(res.status).toBe(401);
  });

  it('una cuenta nueva no tiene color elegido', async () => {
    const ana = await signUp('ana@example.com');
    expect(ana.user.accentColor).toBeNull();
  });

  it('guarda el color, lo normaliza a minúsculas y se ve en GET /auth/me', async () => {
    const ana = await signUp('ana@example.com');

    const res = await request(app)
      .patch(ME)
      .set(bearer(ana.token))
      .send({ accentColor: '#1D4ED8' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'ana@example.com', accentColor: '#1d4ed8' });

    const me = await request(app).get(ME).set(bearer(ana.token));
    expect(me.body.user.accentColor).toBe('#1d4ed8');
  });

  it('con null vuelve al color por defecto', async () => {
    const ana = await signUp('ana@example.com');
    await request(app).patch(ME).set(bearer(ana.token)).send({ accentColor: '#1d4ed8' });

    const res = await request(app).patch(ME).set(bearer(ana.token)).send({ accentColor: null });

    expect(res.status).toBe(200);
    expect(res.body.user.accentColor).toBeNull();
  });

  it('cada cuenta tiene su propio color', async () => {
    const ana = await signUp('ana@example.com');
    const beto = await signUp('beto@example.com');
    await request(app).patch(ME).set(bearer(ana.token)).send({ accentColor: '#15803d' });

    const me = await request(app).get(ME).set(bearer(beto.token));
    expect(me.body.user.accentColor).toBeNull();
  });

  it.each([
    ['un texto que no es un color', 'violeta'],
    ['un color abreviado', '#fff'],
    ['un color demasiado claro para texto blanco', '#ffff00'],
  ])('rechaza %s', async (_name, accentColor) => {
    const ana = await signUp('ana@example.com');

    const res = await request(app).patch(ME).set(bearer(ana.token)).send({ accentColor });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza campos desconocidos (no se puede cambiar el email por acá)', async () => {
    const ana = await signUp('ana@example.com');

    const res = await request(app)
      .patch(ME)
      .set(bearer(ana.token))
      .send({ accentColor: '#4a2b8a', email: 'otro@example.com' });

    expect(res.status).toBe(400);
  });
});
