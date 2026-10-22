/**
 * Tests de integración del módulo de transacciones (Supertest + PostgreSQL real).
 * Igual que los demás, se omiten con un aviso si la base de test no responde.
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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de transacciones.');
}

const app = createApp();
const API = '/api/v1';
const TRANSACTIONS = `${API}/transactions`;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Registra un usuario y devuelve su token y un mapa nombre -> id de sus categorías. */
async function signUp(email: string) {
  const registered = await request(app)
    .post(`${API}/auth/register`)
    .send({ name: 'Usuario Test', email, password: 'Segura123' });
  const token = registered.body.accessToken as string;
  const userId = registered.body.user.id as string;

  const list = await request(app).get(`${API}/categories`).set(bearer(token));
  const categories: Record<string, string> = Object.fromEntries(
    (list.body.data as { id: string; name: string }[]).map((c) => [c.name, c.id]),
  );
  return { token, userId, categories };
}

type Session = Awaited<ReturnType<typeof signUp>>;

function createTx(token: string, body: Record<string, unknown>) {
  return request(app).post(TRANSACTIONS).set(bearer(token)).send(body);
}

/** Crea un gasto en pesos y devuelve su id. */
async function createExpense(session: Session, overrides: Record<string, unknown> = {}) {
  const res = await createTx(session.token, {
    type: 'EXPENSE',
    amount: 1000,
    date: '2026-10-10',
    categoryId: session.categories['Comida'],
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

describe.skipIf(!dbUp)('API de transacciones', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // borra en cascada categorías y movimientos
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('autenticación', () => {
    it('exige sesión en todas las rutas', async () => {
      const responses = await Promise.all([
        request(app).get(TRANSACTIONS),
        request(app).post(TRANSACTIONS).send({}),
        request(app).get(`${TRANSACTIONS}/abc`),
        request(app).patch(`${TRANSACTIONS}/abc`).send({ amount: 1 }),
        request(app).delete(`${TRANSACTIONS}/abc`),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('MISSING_ACCESS_TOKEN');
      }
    });
  });

  describe('POST /transactions', () => {
    it('crea un gasto en pesos con los montos como string', async () => {
      const ana = await signUp('ana@example.com');
      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 45000,
        date: '2026-10-18',
        note: '  Supermercado ',
        categoryId: ana.categories['Comida'],
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({
        id: expect.any(String),
        type: 'EXPENSE',
        amount: '45000.00',
        currency: 'ARS',
        exchangeRate: null,
        amountInBase: '45000.00',
        date: '2026-10-18',
        note: 'Supermercado',
        category: { id: ana.categories['Comida'], name: 'Comida', color: expect.any(String) },
        createdAt: expect.any(String),
      });
    });

    it('convierte un gasto en dólares y guarda la cotización usada', async () => {
      const ana = await signUp('ana@example.com');
      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: '20',
        currency: 'USD',
        exchangeRate: '1250',
        date: '2026-10-18',
        categoryId: ana.categories['Ocio'],
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        amount: '20.00',
        currency: 'USD',
        exchangeRate: '1250.0000',
        amountInBase: '25000.00',
      });
    });

    it('exige la cotización si la moneda no es la base (400)', async () => {
      const ana = await signUp('ana@example.com');
      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 20,
        currency: 'USD',
        date: '2026-10-18',
        categoryId: ana.categories['Ocio'],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXCHANGE_RATE_REQUIRED');
    });

    it('rechaza una categoría de otro tipo (400)', async () => {
      const ana = await signUp('ana@example.com');
      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 100,
        date: '2026-10-18',
        categoryId: ana.categories['Sueldo'], // es de ingresos
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CATEGORY');
    });

    it('rechaza usar una categoría de otro usuario (400) sin revelar que existe', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');

      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 100,
        date: '2026-10-18',
        categoryId: beto.categories['Comida'],
      });
      const unknown = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 100,
        date: '2026-10-18',
        categoryId: 'no-existe',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CATEGORY');
      expect(res.body.error).toEqual(unknown.body.error); // misma respuesta que si no existiera
      expect(await prisma.transaction.count()).toBe(0);
    });

    it('valida los datos de entrada (400 con detalle por campo)', async () => {
      const ana = await signUp('ana@example.com');
      const res = await createTx(ana.token, {
        type: 'EXPENSE',
        amount: 0,
        date: '2026-02-30',
        categoryId: ana.categories['Comida'],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = (res.body.error.details as { field: string }[]).map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['amount', 'date']));
    });
  });

  describe('GET /transactions', () => {
    /** Cinco movimientos: cuatro gastos y un ingreso, repartidos en dos meses. */
    async function seedFive() {
      const ana = await signUp('ana@example.com');
      const c = ana.categories;
      const rows = [
        { type: 'EXPENSE', amount: 1000, date: '2026-09-30', note: 'Cena afuera', cat: 'Comida' },
        { type: 'EXPENSE', amount: 2000, date: '2026-10-05', note: 'Supermercado', cat: 'Comida' },
        { type: 'EXPENSE', amount: 500, date: '2026-10-10', note: 'SUBE', cat: 'Transporte' },
        {
          type: 'INCOME',
          amount: 100000,
          date: '2026-10-05',
          note: 'Sueldo octubre',
          cat: 'Sueldo',
        },
        { type: 'EXPENSE', amount: 3000, date: '2026-10-20', note: 'Delivery', cat: 'Comida' },
      ];
      for (const { cat, ...row } of rows) {
        const res = await createTx(ana.token, { ...row, categoryId: c[cat] });
        expect(res.status).toBe(201);
      }
      return ana;
    }

    const list = (token: string, query = '') =>
      request(app).get(`${TRANSACTIONS}${query}`).set(bearer(token));

    it('ordena por fecha descendente y devuelve la paginación', async () => {
      const ana = await seedFive();
      const res = await list(ana.token);

      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1 });
      expect(res.body.data.map((t: { date: string }) => t.date)).toEqual([
        '2026-10-20',
        '2026-10-10',
        '2026-10-05',
        '2026-10-05',
        '2026-09-30',
      ]);
    });

    it('filtra por rango de fechas, inclusive en los extremos', async () => {
      const ana = await seedFive();
      const res = await list(ana.token, '?from=2026-10-01&to=2026-10-31');
      expect(res.body.meta.total).toBe(4);

      const edge = await list(ana.token, '?from=2026-10-05&to=2026-10-05');
      expect(edge.body.meta.total).toBe(2);
    });

    it('filtra por tipo y por categoría', async () => {
      const ana = await seedFive();

      const income = await list(ana.token, '?type=INCOME');
      expect(income.body.meta.total).toBe(1);
      expect(income.body.data[0].note).toBe('Sueldo octubre');

      const comida = await list(ana.token, `?categoryId=${ana.categories['Comida']}`);
      expect(comida.body.meta.total).toBe(3);
    });

    it('busca en la nota y en el nombre de la categoría, sin distinguir mayúsculas', async () => {
      const ana = await seedFive();

      const byNote = await list(ana.token, '?q=SUPER');
      expect(byNote.body.meta.total).toBe(1);
      expect(byNote.body.data[0].note).toBe('Supermercado');

      const byCategory = await list(ana.token, '?q=transporte');
      expect(byCategory.body.meta.total).toBe(1);
      expect(byCategory.body.data[0].note).toBe('SUBE');
    });

    it('ordena por monto', async () => {
      const ana = await seedFive();
      const res = await list(ana.token, '?sortBy=amount&order=desc');

      expect(res.body.data[0].amount).toBe('100000.00');
      expect(res.body.data[4].amount).toBe('500.00');
    });

    it('pagina sin repetir ni perder movimientos', async () => {
      const ana = await seedFive();

      const first = await list(ana.token, '?pageSize=2&page=1');
      const last = await list(ana.token, '?pageSize=2&page=3');
      expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
      expect(first.body.data).toHaveLength(2);
      expect(last.body.data).toHaveLength(1);

      const ids: string[] = [];
      for (const page of [1, 2, 3]) {
        const res = await list(ana.token, `?pageSize=2&page=${page}`);
        ids.push(...res.body.data.map((t: { id: string }) => t.id));
      }
      expect(new Set(ids).size).toBe(5);
    });

    it('rechaza filtros inválidos (400)', async () => {
      const ana = await seedFive();

      for (const query of [
        '?from=2026-11-01&to=2026-10-01',
        '?pageSize=500',
        '?type=OTRO',
        '?from=ayer',
      ]) {
        const res = await list(ana.token, query);
        expect(res.status, query).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('un usuario nunca ve los movimientos de otro', async () => {
      await seedFive();
      const beto = await signUp('beto@example.com');

      const res = await list(beto.token);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('GET /transactions/:id', () => {
    it('devuelve el movimiento propio y 404 para uno inexistente', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);

      const found = await request(app).get(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));
      expect(found.status).toBe(200);
      expect(found.body.data.id).toBe(id);

      const missing = await request(app).get(`${TRANSACTIONS}/no-existe`).set(bearer(ana.token));
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('PATCH /transactions/:id', () => {
    const patch = (token: string, id: string, body: Record<string, unknown>) =>
      request(app).patch(`${TRANSACTIONS}/${id}`).set(bearer(token)).send(body);

    it('recalcula el monto en moneda base al cambiar monto, cotización o moneda', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana, {
        amount: 20,
        currency: 'USD',
        exchangeRate: 1250,
        categoryId: ana.categories['Ocio'],
      });

      const amount = await patch(ana.token, id, { amount: '30' });
      expect(amount.status).toBe(200);
      expect(amount.body.data).toMatchObject({ amount: '30.00', amountInBase: '37500.00' });

      const rate = await patch(ana.token, id, { exchangeRate: '1300' });
      expect(rate.body.data).toMatchObject({ exchangeRate: '1300.0000', amountInBase: '39000.00' });

      const toArs = await patch(ana.token, id, { currency: 'ARS' });
      expect(toArs.body.data).toMatchObject({
        currency: 'ARS',
        exchangeRate: null,
        amountInBase: '30.00',
      });
    });

    it('al volver a una moneda extranjera exige una cotización nueva (400)', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);

      const res = await patch(ana.token, id, { currency: 'USD' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXCHANGE_RATE_REQUIRED');

      const ok = await patch(ana.token, id, { currency: 'USD', exchangeRate: 1000 });
      expect(ok.status).toBe(200);
      expect(ok.body.data.amountInBase).toBe('1000000.00'); // 1000 USD × 1000
    });

    it('modifica fecha, nota y categoría', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana, { note: 'Original' });

      const res = await patch(ana.token, id, {
        date: '2026-11-01',
        note: null,
        categoryId: ana.categories['Transporte'],
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        date: '2026-11-01',
        note: null,
        category: { name: 'Transporte' },
      });
    });

    it('rechaza una categoría de otro tipo, un cuerpo vacío y el cambio de tipo (400)', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);

      const wrongCategory = await patch(ana.token, id, { categoryId: ana.categories['Sueldo'] });
      const empty = await patch(ana.token, id, {});
      const changeType = await patch(ana.token, id, { type: 'INCOME' });

      expect(wrongCategory.status).toBe(400);
      expect(wrongCategory.body.error.code).toBe('INVALID_CATEGORY');
      expect(empty.status).toBe(400);
      expect(changeType.status).toBe(400);
    });

    it('responde 404 si el movimiento no existe', async () => {
      const ana = await signUp('ana@example.com');
      const res = await patch(ana.token, 'no-existe', { amount: 5 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('hace un borrado lógico: desaparece de la API pero la fila se conserva', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);

      const res = await request(app).delete(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));
      expect(res.status).toBe(204);

      const get = await request(app).get(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));
      expect(get.status).toBe(404);

      const list = await request(app).get(TRANSACTIONS).set(bearer(ana.token));
      expect(list.body.meta.total).toBe(0);

      const row = await prisma.transaction.findUniqueOrThrow({ where: { id } });
      expect(row.deletedAt).not.toBeNull();
    });

    it('no se puede borrar dos veces (404) ni editar un movimiento borrado', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);

      await request(app).delete(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));
      const again = await request(app).delete(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));
      const edit = await request(app)
        .patch(`${TRANSACTIONS}/${id}`)
        .set(bearer(ana.token))
        .send({ amount: 5 });

      expect(again.status).toBe(404);
      expect(edit.status).toBe(404);
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('un usuario no puede ver, modificar ni borrar los movimientos de otro', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      const id = await createExpense(ana, { amount: 777, note: 'Privado' });

      const get = await request(app).get(`${TRANSACTIONS}/${id}`).set(bearer(beto.token));
      const patch = await request(app)
        .patch(`${TRANSACTIONS}/${id}`)
        .set(bearer(beto.token))
        .send({ amount: 1, note: 'Hackeado' });
      const del = await request(app).delete(`${TRANSACTIONS}/${id}`).set(bearer(beto.token));

      for (const res of [get, patch, del]) {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('TRANSACTION_NOT_FOUND');
      }

      // El movimiento de Ana quedó intacto
      const intact = await prisma.transaction.findUniqueOrThrow({ where: { id } });
      expect(intact.userId).toBe(ana.userId);
      expect(intact.deletedAt).toBeNull();
      expect(intact.note).toBe('Privado');
      expect(intact.amount.toFixed(2)).toBe('777.00');
    });
  });

  describe('integración con categorías', () => {
    it('una categoría con movimientos borrados lógicamente sigue sin poder eliminarse', async () => {
      const ana = await signUp('ana@example.com');
      const id = await createExpense(ana);
      await request(app).delete(`${TRANSACTIONS}/${id}`).set(bearer(ana.token));

      const res = await request(app)
        .delete(`${API}/categories/${ana.categories['Comida']}`)
        .set(bearer(ana.token));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_IN_USE');
    });
  });
});
