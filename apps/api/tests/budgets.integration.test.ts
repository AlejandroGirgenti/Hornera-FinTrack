/**
 * Tests de integración de presupuestos por categoría (Supertest + PostgreSQL real).
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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de presupuestos.');
}

const app = createApp();
const API = '/api/v1';
const BUDGETS = `${API}/budgets`;
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Registra un usuario y devuelve su token y un mapa nombre -> id de sus categorías. */
async function signUp(email: string) {
  const registered = await request(app)
    .post(`${API}/auth/register`)
    .send({ name: 'Usuario Test', email, password: 'Segura123' });
  const token = registered.body.accessToken as string;
  const list = await request(app).get(`${API}/categories`).set(bearer(token));
  const categories: Record<string, string> = Object.fromEntries(
    (list.body.data as { id: string; name: string }[]).map((c) => [c.name, c.id]),
  );
  return { token, categories };
}

type Session = Awaited<ReturnType<typeof signUp>>;

const setBudget = (s: Session, body: Record<string, unknown>) =>
  request(app).put(BUDGETS).set(bearer(s.token)).send(body);

const getBudgets = (s: Session, month: string) =>
  request(app).get(`${BUDGETS}?month=${month}`).set(bearer(s.token));

async function addExpense(s: Session, categoryName: string, amount: number, date: string) {
  const res = await request(app)
    .post(`${API}/transactions`)
    .set(bearer(s.token))
    .send({ type: 'EXPENSE', amount, date, categoryId: s.categories[categoryName] });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

describe.skipIf(!dbUp)('API de presupuestos', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // borra en cascada categorías, movimientos y presupuestos
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exige sesión en todas las rutas', async () => {
    const responses = await Promise.all([
      request(app).get(`${BUDGETS}?month=2026-10`),
      request(app).put(BUDGETS).send({}),
      request(app).delete(`${BUDGETS}?categoryId=x&month=2026-10`),
      request(app).post(`${BUDGETS}/copy`).send({ month: '2026-10' }),
    ]);
    expect(responses.map((res) => res.status)).toEqual([401, 401, 401, 401]);
  });

  describe('GET /budgets', () => {
    it('sin presupuestos, lista todas las categorías de gastos como "sin límite"', async () => {
      const ana = await signUp('ana@example.com');
      const res = await getBudgets(ana, '2026-10');
      expect(res.status).toBe(200);
      const { items, unbudgeted, totals } = res.body.data;
      expect(items).toEqual([]);
      expect(unbudgeted.length).toBeGreaterThan(0);
      expect(unbudgeted[0]).toMatchObject({ limit: null, percent: null, status: null });
      expect(totals).toMatchObject({
        budgeted: '0.00',
        spent: '0.00',
        percent: null,
        status: null,
      });
    });

    it('valida el mes', async () => {
      const ana = await signUp('ana@example.com');
      expect((await getBudgets(ana, '2026-13')).status).toBe(400);
      const missing = await request(app).get(BUDGETS).set(bearer(ana.token));
      expect(missing.status).toBe(400);
      expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('suma lo gastado del mes y calcula porcentaje, estado y lo que queda', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      await addExpense(ana, 'Comida', 300, '2026-10-05');
      await addExpense(ana, 'Comida', 550, '2026-10-20');

      const res = await getBudgets(ana, '2026-10');
      const item = res.body.data.items.find(
        (i: { category: { name: string } }) => i.category.name === 'Comida',
      );
      expect(item).toMatchObject({
        limit: '1000.00',
        spent: '850.00',
        remaining: '150.00',
        percent: 85,
        status: 'near',
      });
      expect(res.body.data.totals).toMatchObject({
        budgeted: '1000.00',
        spent: '850.00',
        remaining: '150.00',
        percent: 85,
        status: 'near',
      });
      // Comida ya no figura entre las categorías sin límite
      expect(
        res.body.data.unbudgeted.some(
          (i: { category: { name: string } }) => i.category.name === 'Comida',
        ),
      ).toBe(false);
    });

    it('marca "over" cuando se pasa y muestra lo que queda en negativo', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 100,
      });
      await addExpense(ana, 'Comida', 130, '2026-10-05');
      const res = await getBudgets(ana, '2026-10');
      expect(res.body.data.items[0]).toMatchObject({
        spent: '130.00',
        remaining: '-30.00',
        percent: 130,
        status: 'over',
      });
    });

    it('no cuenta otros meses, ingresos ni movimientos borrados', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      await addExpense(ana, 'Comida', 100, '2026-10-01');
      await addExpense(ana, 'Comida', 100, '2026-10-31');
      await addExpense(ana, 'Comida', 999, '2026-09-30'); // mes anterior
      await addExpense(ana, 'Comida', 999, '2026-11-01'); // mes siguiente
      const borrado = await addExpense(ana, 'Comida', 500, '2026-10-10');
      await request(app).delete(`${API}/transactions/${borrado}`).set(bearer(ana.token));
      await request(app).post(`${API}/transactions`).set(bearer(ana.token)).send({
        type: 'INCOME',
        amount: 5000,
        date: '2026-10-10',
        categoryId: ana.categories['Sueldo'],
      });

      const res = await getBudgets(ana, '2026-10');
      expect(res.body.data.items[0].spent).toBe('200.00');
    });

    it('cuenta los gastos en moneda extranjera ya convertidos a la moneda base', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 50000,
      });
      const created = await request(app).post(`${API}/transactions`).set(bearer(ana.token)).send({
        type: 'EXPENSE',
        amount: 10,
        currency: 'USD',
        exchangeRate: 1000,
        date: '2026-10-10',
        categoryId: ana.categories['Comida'],
      });
      expect(created.status).toBe(201);
      const res = await getBudgets(ana, '2026-10');
      expect(res.body.data.items[0].spent).toBe('10000.00');
    });

    it('los presupuestos de un mes no aparecen en otro', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      const res = await getBudgets(ana, '2026-11');
      expect(res.body.data.items).toEqual([]);
    });

    it('cada persona ve solo lo suyo', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      await addExpense(ana, 'Comida', 100, '2026-10-05');
      const res = await getBudgets(beto, '2026-10');
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.totals.spent).toBe('0.00');
    });
  });

  describe('PUT /budgets', () => {
    it('crea el límite y lo cambia sin duplicarlo', async () => {
      const ana = await signUp('ana@example.com');
      const body = {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: '200000',
      };
      const created = await setBudget(ana, body);
      expect(created.status).toBe(200);
      expect(created.body.data).toEqual({
        categoryId: body.categoryId,
        month: '2026-10',
        limitAmount: '200000.00',
      });

      const changed = await setBudget(ana, { ...body, limitAmount: 250000.5 });
      expect(changed.body.data.limitAmount).toBe('250000.50');
      expect(await prisma.budget.count()).toBe(1);
    });

    it('rechaza montos inválidos y meses inválidos', async () => {
      const ana = await signUp('ana@example.com');
      const base = { categoryId: ana.categories['Comida'], month: '2026-10' };
      expect((await setBudget(ana, { ...base, limitAmount: 0 })).status).toBe(400);
      expect((await setBudget(ana, { ...base, limitAmount: '10.123' })).status).toBe(400);
      expect((await setBudget(ana, { ...base, limitAmount: 10, month: 'octubre' })).status).toBe(
        400,
      );
    });

    it('no acepta categorías de ingresos', async () => {
      const ana = await signUp('ana@example.com');
      const res = await setBudget(ana, {
        categoryId: ana.categories['Sueldo'],
        month: '2026-10',
        limitAmount: 1000,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BUDGET_ONLY_FOR_EXPENSES');
    });

    it('responde 404 con una categoría que no existe o es de otra persona', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      const ajena = await setBudget(ana, {
        categoryId: beto.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      expect(ajena.status).toBe(404);
      expect(ajena.body.error.code).toBe('CATEGORY_NOT_FOUND');
      const inexistente = await setBudget(ana, {
        categoryId: 'no-existe',
        month: '2026-10',
        limitAmount: 1,
      });
      expect(inexistente.status).toBe(404);
    });
  });

  describe('DELETE /budgets', () => {
    it('quita el límite y es idempotente', async () => {
      const ana = await signUp('ana@example.com');
      const categoryId = ana.categories['Comida'];
      await setBudget(ana, { categoryId, month: '2026-10', limitAmount: 1000 });

      const url = `${BUDGETS}?categoryId=${categoryId}&month=2026-10`;
      expect((await request(app).delete(url).set(bearer(ana.token))).status).toBe(204);
      expect((await request(app).delete(url).set(bearer(ana.token))).status).toBe(204);
      expect((await getBudgets(ana, '2026-10')).body.data.items).toEqual([]);
    });

    it('no toca los presupuestos de otra persona', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-10',
        limitAmount: 1000,
      });
      await request(app)
        .delete(`${BUDGETS}?categoryId=${ana.categories['Comida']}&month=2026-10`)
        .set(bearer(beto.token));
      expect((await getBudgets(ana, '2026-10')).body.data.items).toHaveLength(1);
    });

    it('exige categoría y mes', async () => {
      const ana = await signUp('ana@example.com');
      const res = await request(app).delete(`${BUDGETS}?month=2026-10`).set(bearer(ana.token));
      expect(res.status).toBe(400);
    });
  });

  describe('POST /budgets/copy', () => {
    it('copia los límites del mes anterior sin pisar los que ya existen', async () => {
      const ana = await signUp('ana@example.com');
      const comida = ana.categories['Comida'] as string;
      const transporte = ana.categories['Transporte'] as string;
      await setBudget(ana, { categoryId: comida, month: '2026-09', limitAmount: 1000 });
      await setBudget(ana, { categoryId: transporte, month: '2026-09', limitAmount: 500 });
      await setBudget(ana, { categoryId: comida, month: '2026-10', limitAmount: 1200 }); // ya ajustado

      const res = await request(app)
        .post(`${BUDGETS}/copy`)
        .set(bearer(ana.token))
        .send({ month: '2026-10' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ from: '2026-09', copied: 1 });

      const items = (await getBudgets(ana, '2026-10')).body.data.items as {
        category: { id: string };
        limit: string;
      }[];
      const limitOf = (id: string) => items.find((item) => item.category.id === id)?.limit;
      expect(limitOf(comida)).toBe('1200.00'); // no se pisó
      expect(limitOf(transporte)).toBe('500.00'); // se copió
    });

    it('funciona al cambiar de año (enero copia desde diciembre)', async () => {
      const ana = await signUp('ana@example.com');
      await setBudget(ana, {
        categoryId: ana.categories['Comida'],
        month: '2026-12',
        limitAmount: 1000,
      });
      const res = await request(app)
        .post(`${BUDGETS}/copy`)
        .set(bearer(ana.token))
        .send({ month: '2027-01' });
      expect(res.body.data).toEqual({ from: '2026-12', copied: 1 });
    });

    it('si el mes anterior no tenía presupuestos, no copia nada', async () => {
      const ana = await signUp('ana@example.com');
      const res = await request(app)
        .post(`${BUDGETS}/copy`)
        .set(bearer(ana.token))
        .send({ month: '2026-10' });
      expect(res.status).toBe(200);
      expect(res.body.data.copied).toBe(0);
    });
  });

  describe('relación con otras partes', () => {
    it('borrar una categoría sin movimientos borra también su presupuesto', async () => {
      const ana = await signUp('ana@example.com');
      const categoryId = ana.categories['Salud'] as string;
      await setBudget(ana, { categoryId, month: '2026-10', limitAmount: 1000 });
      const res = await request(app)
        .delete(`${API}/categories/${categoryId}`)
        .set(bearer(ana.token));
      expect(res.status).toBe(204);
      expect(await prisma.budget.count()).toBe(0);
    });
  });
});
