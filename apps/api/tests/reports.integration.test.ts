/**
 * Tests de integración de los reportes (Supertest + PostgreSQL real).
 * Igual que los demás, se omiten con un aviso si la base de test no responde.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { addMonths, monthRange, todayInBuenosAires } from '../src/lib/dates';
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
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de reportes.');
}

const app = createApp();
const API = '/api/v1';
const REPORTS = `${API}/reports`;

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

interface NewTransaction {
  type?: 'INCOME' | 'EXPENSE';
  amount: number | string;
  date: string;
  category: string;
  currency?: 'ARS' | 'USD';
  exchangeRate?: number;
}

/** Crea un movimiento por la API (gasto en pesos por defecto) y devuelve su id. */
async function addTx(session: Session, tx: NewTransaction) {
  const { category, ...rest } = tx;
  const res = await request(app)
    .post(`${API}/transactions`)
    .set(bearer(session.token))
    .send({ type: 'EXPENSE', ...rest, categoryId: session.categories[category] });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data.id as string;
}

const get = (token: string, path: string) =>
  request(app).get(`${REPORTS}${path}`).set(bearer(token));

describe.skipIf(!dbUp)('API de reportes', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // borra en cascada categorías y movimientos
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('autenticación', () => {
    it('exige sesión en todas las rutas', async () => {
      const responses = await Promise.all([
        request(app).get(`${REPORTS}/summary`),
        request(app).get(`${REPORTS}/by-category`),
        request(app).get(`${REPORTS}/monthly-trend`),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('MISSING_ACCESS_TOKEN');
      }
    });
  });

  describe('GET /reports/summary', () => {
    async function seedOctober() {
      const ana = await signUp('ana@example.com');
      await addTx(ana, { type: 'INCOME', amount: 100000, date: '2026-10-05', category: 'Sueldo' });
      await addTx(ana, { amount: 1000, date: '2026-10-05', category: 'Comida' });
      await addTx(ana, { amount: 2000, date: '2026-10-10', category: 'Comida' });
      // 20 USD a 1250 = 25000 pesos
      await addTx(ana, {
        amount: 20,
        currency: 'USD',
        exchangeRate: 1250,
        date: '2026-10-12',
        category: 'Ocio',
      });
      // Fuera del período
      await addTx(ana, { amount: 5000, date: '2026-09-30', category: 'Comida' });
      // Borrado lógicamente: no debe contar
      const deleted = await addTx(ana, { amount: 9999, date: '2026-10-15', category: 'Comida' });
      await request(app).delete(`${API}/transactions/${deleted}`).set(bearer(ana.token));
      return ana;
    }

    it('suma ingresos y gastos del período en moneda base', async () => {
      const ana = await seedOctober();
      const res = await get(ana.token, '/summary?from=2026-10-01&to=2026-10-31');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        period: { from: '2026-10-01', to: '2026-10-31' },
        income: '100000.00',
        expense: '28000.00', // 1000 + 2000 + 25000 (los 9999 borrados no cuentan)
        balance: '72000.00',
        transactionCount: 4,
      });
    });

    it('incluye los extremos del período y amplía el rango', async () => {
      const ana = await seedOctober();

      const wide = await get(ana.token, '/summary?from=2026-09-01&to=2026-10-31');
      expect(wide.body.data.expense).toBe('33000.00'); // suma los 5000 de septiembre

      const edge = await get(ana.token, '/summary?from=2026-09-30&to=2026-09-30');
      expect(edge.body.data).toMatchObject({ expense: '5000.00', transactionCount: 1 });
    });

    it('devuelve ceros si no hay movimientos', async () => {
      const ana = await signUp('ana@example.com');
      const res = await get(ana.token, '/summary?from=2026-01-01&to=2026-01-31');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        income: '0.00',
        expense: '0.00',
        balance: '0.00',
        transactionCount: 0,
      });
    });

    it('sin fechas usa el mes en curso en Buenos Aires', async () => {
      const ana = await signUp('ana@example.com');
      const today = todayInBuenosAires();
      await addTx(ana, { amount: 1234.5, date: today, category: 'Comida' });

      const res = await get(ana.token, '/summary');

      expect(res.status).toBe(200);
      expect(res.body.data.period).toEqual(monthRange(today));
      expect(res.body.data).toMatchObject({ expense: '1234.50', transactionCount: 1 });
    });

    it('rechaza períodos inválidos (400)', async () => {
      const ana = await signUp('ana@example.com');

      for (const query of [
        '?from=2026-10-01',
        '?to=2026-10-31',
        '?from=2026-11-01&to=2026-10-01',
        '?from=ayer&to=hoy',
      ]) {
        const res = await get(ana.token, `/summary${query}`);
        expect(res.status, query).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('GET /reports/by-category', () => {
    async function seedExpenses() {
      const ana = await signUp('ana@example.com');
      await addTx(ana, { amount: 1000, date: '2026-10-05', category: 'Comida' });
      await addTx(ana, { amount: 2000, date: '2026-10-10', category: 'Comida' });
      await addTx(ana, { amount: 500, date: '2026-10-11', category: 'Transporte' });
      await addTx(ana, { amount: 6500, date: '2026-10-12', category: 'Ocio' });
      await addTx(ana, { type: 'INCOME', amount: 100000, date: '2026-10-05', category: 'Sueldo' });
      return ana;
    }

    const period = '?from=2026-10-01&to=2026-10-31';

    it('reparte los gastos por categoría, de mayor a menor, con porcentajes', async () => {
      const ana = await seedExpenses();
      const res = await get(ana.token, `/by-category${period}`);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('EXPENSE');
      expect(res.body.data.total).toBe('10000.00'); // el ingreso no se mezcla
      expect(res.body.data.items).toEqual([
        {
          category: { id: ana.categories['Ocio'], name: 'Ocio', color: expect.any(String) },
          total: '6500.00',
          percentage: 65,
          transactionCount: 1,
        },
        {
          category: { id: ana.categories['Comida'], name: 'Comida', color: expect.any(String) },
          total: '3000.00',
          percentage: 30,
          transactionCount: 2,
        },
        {
          category: {
            id: ana.categories['Transporte'],
            name: 'Transporte',
            color: expect.any(String),
          },
          total: '500.00',
          percentage: 5,
          transactionCount: 1,
        },
      ]);
    });

    it('permite ver los ingresos con type=INCOME', async () => {
      const ana = await seedExpenses();
      const res = await get(ana.token, `/by-category${period}&type=INCOME`);

      expect(res.body.data.type).toBe('INCOME');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({
        category: { name: 'Sueldo' },
        total: '100000.00',
        percentage: 100,
      });
    });

    it('devuelve una lista vacía y total en cero si no hay gastos', async () => {
      const ana = await signUp('ana@example.com');
      const res = await get(ana.token, `/by-category${period}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ total: '0.00', items: [] });
    });

    it('rechaza un tipo inválido (400)', async () => {
      const ana = await signUp('ana@example.com');
      const res = await get(ana.token, `/by-category${period}&type=OTRO`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /reports/monthly-trend', () => {
    // Los meses se calculan a partir de hoy (en Buenos Aires) para que el test no dependa de la fecha
    const currentMonth = todayInBuenosAires().slice(0, 7);
    const monthsAgo = (n: number) => addMonths(currentMonth, -n);

    async function seedTrend() {
      const ana = await signUp('ana@example.com');
      await addTx(ana, {
        type: 'INCOME',
        amount: 1000,
        date: `${currentMonth}-15`,
        category: 'Sueldo',
      });
      await addTx(ana, { amount: 400, date: `${currentMonth}-15`, category: 'Comida' });
      await addTx(ana, { amount: 250.5, date: `${monthsAgo(1)}-01`, category: 'Comida' });
      await addTx(ana, {
        type: 'INCOME',
        amount: 2000,
        date: `${monthsAgo(3)}-28`,
        category: 'Sueldo',
      });
      // Más viejo que la ventana pedida: no debe aparecer
      await addTx(ana, { amount: 999, date: `${monthsAgo(5)}-10`, category: 'Comida' });
      return ana;
    }

    it('devuelve un punto por mes, del más viejo al más nuevo, rellenando los meses vacíos', async () => {
      const ana = await seedTrend();
      const res = await get(ana.token, '/monthly-trend?months=4');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { month: monthsAgo(3), income: '2000.00', expense: '0.00', balance: '2000.00' },
        { month: monthsAgo(2), income: '0.00', expense: '0.00', balance: '0.00' },
        { month: monthsAgo(1), income: '0.00', expense: '250.50', balance: '-250.50' },
        { month: currentMonth, income: '1000.00', expense: '400.00', balance: '600.00' },
      ]);
    });

    it('usa 6 meses por defecto', async () => {
      const ana = await seedTrend();
      const res = await get(ana.token, '/monthly-trend');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(6);
      expect(res.body.data[5].month).toBe(currentMonth);
      // Con 6 meses ya entra el gasto de hace 5 meses
      expect(res.body.data[0]).toMatchObject({ month: monthsAgo(5), expense: '999.00' });
    });

    it('rechaza una cantidad de meses fuera de rango (400)', async () => {
      const ana = await signUp('ana@example.com');

      for (const months of ['0', '25', '-1', 'abc']) {
        const res = await get(ana.token, `/monthly-trend?months=${months}`);
        expect(res.status, months).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('los reportes de un usuario nunca incluyen los movimientos de otro', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      const today = todayInBuenosAires();
      await addTx(ana, { amount: 5000, date: today, category: 'Comida' });

      const summary = await get(beto.token, '/summary');
      const byCategory = await get(beto.token, '/by-category');
      const trend = await get(beto.token, '/monthly-trend?months=3');

      expect(summary.body.data).toMatchObject({ expense: '0.00', transactionCount: 0 });
      expect(byCategory.body.data).toMatchObject({ total: '0.00', items: [] });
      for (const point of trend.body.data as { expense: string }[]) {
        expect(point.expense).toBe('0.00');
      }
    });
  });
});
