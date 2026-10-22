/**
 * Tests de integración del módulo de categorías (Supertest + PostgreSQL real).
 * Igual que los de autenticación, se omiten con un aviso si la base de test no responde.
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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de categorías.');
}

const app = createApp();
const API = '/api/v1';
const CATEGORIES = `${API}/categories`;

const DEFAULT_COUNT = DEFAULT_CATEGORIES.length;
const DEFAULT_INCOME_COUNT = DEFAULT_CATEGORIES.filter((c) => c.type === 'INCOME').length;

/** Registra un usuario y devuelve su id y su access token. */
async function signUp(email: string) {
  const res = await request(app)
    .post(`${API}/auth/register`)
    .send({ name: 'Usuario Test', email, password: 'Segura123' });
  return { userId: res.body.user.id as string, token: res.body.accessToken as string };
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createCategory(token: string, body: Record<string, unknown>) {
  return request(app).post(CATEGORIES).set(bearer(token)).send(body);
}

describe.skipIf(!dbUp)('API de categorías', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // borra en cascada categorías y movimientos
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('autenticación', () => {
    it('exige sesión en todas las rutas', async () => {
      const responses = await Promise.all([
        request(app).get(CATEGORIES),
        request(app).post(CATEGORIES).send({ name: 'X', type: 'EXPENSE' }),
        request(app).patch(`${CATEGORIES}/abc`).send({ name: 'X' }),
        request(app).delete(`${CATEGORIES}/abc`),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('MISSING_ACCESS_TOKEN');
      }
    });
  });

  describe('GET /categories', () => {
    it('devuelve las categorías por defecto creadas al registrarse', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await request(app).get(CATEGORIES).set(bearer(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(DEFAULT_COUNT);
      expect(res.body.data[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.stringMatching(/^(INCOME|EXPENSE)$/),
        color: expect.stringMatching(/^#[0-9a-f]{6}$/),
        icon: null,
        createdAt: expect.any(String),
      });
    });

    it('filtra por tipo', async () => {
      const { token } = await signUp('ana@example.com');

      const income = await request(app).get(`${CATEGORIES}?type=INCOME`).set(bearer(token));
      expect(income.status).toBe(200);
      expect(income.body.data).toHaveLength(DEFAULT_INCOME_COUNT);
      expect(income.body.data.every((c: { type: string }) => c.type === 'INCOME')).toBe(true);
    });

    it('rechaza un tipo inválido (400)', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await request(app).get(`${CATEGORIES}?type=OTRO`).set(bearer(token));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /categories', () => {
    it('crea una categoría con color por defecto', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await createCategory(token, { name: '  Mascotas ', type: 'EXPENSE' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Mascotas', // se recortan los espacios
        type: 'EXPENSE',
        color: '#6366f1',
        icon: null,
      });

      const list = await request(app).get(CATEGORIES).set(bearer(token));
      expect(list.body.data).toHaveLength(DEFAULT_COUNT + 1);
    });

    it('normaliza el color a minúsculas', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await createCategory(token, {
        name: 'Mascotas',
        type: 'EXPENSE',
        color: '#FF00AA',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.color).toBe('#ff00aa');
    });

    it('rechaza duplicados del mismo usuario y tipo (409)', async () => {
      const { token } = await signUp('ana@example.com');
      await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const res = await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_EXISTS');
    });

    it('permite el mismo nombre con otro tipo, o en otra cuenta', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');

      await createCategory(ana.token, { name: 'Varios', type: 'EXPENSE' });
      const otherType = await createCategory(ana.token, { name: 'Varios', type: 'INCOME' });
      const otherUser = await createCategory(beto.token, { name: 'Varios', type: 'EXPENSE' });

      expect(otherType.status).toBe(201);
      expect(otherUser.status).toBe(201);
    });

    it('valida los datos de entrada (400)', async () => {
      const { token } = await signUp('ana@example.com');

      const badColor = await createCategory(token, { name: 'X', type: 'EXPENSE', color: 'rojo' });
      const noType = await createCategory(token, { name: 'X' });
      const emptyName = await createCategory(token, { name: '   ', type: 'EXPENSE' });

      for (const res of [badColor, noType, emptyName]) {
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('PATCH /categories/:id', () => {
    it('modifica nombre, color e ícono', async () => {
      const { token } = await signUp('ana@example.com');
      const created = await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const id = created.body.data.id as string;

      const res = await request(app)
        .patch(`${CATEGORIES}/${id}`)
        .set(bearer(token))
        .send({ name: 'Veterinaria', color: '#112233', icon: 'paw' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id,
        name: 'Veterinaria',
        color: '#112233',
        icon: 'paw',
        type: 'EXPENSE',
      });

      const cleared = await request(app)
        .patch(`${CATEGORIES}/${id}`)
        .set(bearer(token))
        .send({ icon: null });
      expect(cleared.body.data.icon).toBeNull();
    });

    it('rechaza un cuerpo vacío y el cambio de tipo (400)', async () => {
      const { token } = await signUp('ana@example.com');
      const created = await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const id = created.body.data.id as string;

      const empty = await request(app).patch(`${CATEGORIES}/${id}`).set(bearer(token)).send({});
      const changeType = await request(app)
        .patch(`${CATEGORIES}/${id}`)
        .set(bearer(token))
        .send({ type: 'INCOME' });

      expect(empty.status).toBe(400);
      expect(changeType.status).toBe(400);
    });

    it('rechaza renombrar a un nombre que ya existe (409)', async () => {
      const { token } = await signUp('ana@example.com');
      await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const other = await createCategory(token, { name: 'Veterinaria', type: 'EXPENSE' });

      const res = await request(app)
        .patch(`${CATEGORIES}/${other.body.data.id as string}`)
        .set(bearer(token))
        .send({ name: 'Mascotas' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_EXISTS');
    });

    it('responde 404 si la categoría no existe', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await request(app)
        .patch(`${CATEGORIES}/no-existe`)
        .set(bearer(token))
        .send({ name: 'X' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('elimina una categoría sin movimientos', async () => {
      const { token } = await signUp('ana@example.com');
      const created = await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const id = created.body.data.id as string;

      const res = await request(app).delete(`${CATEGORIES}/${id}`).set(bearer(token));
      expect(res.status).toBe(204);
      expect(await prisma.category.findUnique({ where: { id } })).toBeNull();
    });

    it('no elimina una categoría con movimientos (409), ni siquiera si están borrados lógicamente', async () => {
      const { token, userId } = await signUp('ana@example.com');
      const created = await createCategory(token, { name: 'Mascotas', type: 'EXPENSE' });
      const id = created.body.data.id as string;

      const transaction = await prisma.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: '1500.00',
          amountInBase: '1500.00',
          date: new Date('2026-10-01'),
          userId,
          categoryId: id,
        },
      });

      const withTransaction = await request(app).delete(`${CATEGORIES}/${id}`).set(bearer(token));
      expect(withTransaction.status).toBe(409);
      expect(withTransaction.body.error.code).toBe('CATEGORY_IN_USE');

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { deletedAt: new Date() },
      });
      const withSoftDeleted = await request(app).delete(`${CATEGORIES}/${id}`).set(bearer(token));
      expect(withSoftDeleted.status).toBe(409);

      expect(await prisma.category.findUnique({ where: { id } })).not.toBeNull();
    });

    it('responde 404 si la categoría no existe', async () => {
      const { token } = await signUp('ana@example.com');
      const res = await request(app).delete(`${CATEGORIES}/no-existe`).set(bearer(token));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('un usuario no puede ver, modificar ni borrar las categorías de otro', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');

      const created = await createCategory(ana.token, { name: 'Secreta', type: 'EXPENSE' });
      const id = created.body.data.id as string;

      // Beto no la ve en su listado
      const betoList = await request(app).get(CATEGORIES).set(bearer(beto.token));
      const names = betoList.body.data.map((c: { name: string }) => c.name);
      expect(names).not.toContain('Secreta');
      expect(betoList.body.data).toHaveLength(DEFAULT_COUNT);

      // Beto no puede modificarla: responde 404, igual que si no existiera
      const patch = await request(app)
        .patch(`${CATEGORIES}/${id}`)
        .set(bearer(beto.token))
        .send({ name: 'Hackeada', color: '#000000' });
      expect(patch.status).toBe(404);
      expect(patch.body.error.code).toBe('CATEGORY_NOT_FOUND');

      // Beto no puede borrarla
      const del = await request(app).delete(`${CATEGORIES}/${id}`).set(bearer(beto.token));
      expect(del.status).toBe(404);

      // La categoría de Ana quedó intacta
      const intact = await prisma.category.findUniqueOrThrow({ where: { id } });
      expect(intact).toMatchObject({ name: 'Secreta', userId: ana.userId, color: '#6366f1' });
    });
  });
});
