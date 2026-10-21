/**
 * Crea un usuario demo con 6 meses de movimientos realistas y presupuestos del mes actual.
 * Es idempotente: si el usuario demo ya existe, lo borra y lo vuelve a crear.
 *
 *   pnpm db:seed
 */
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '../src/modules/auth/default-categories';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@fintrack.dev';
const DEMO_PASSWORD = 'Demo1234';
const MONTHS = 6;

// Generador pseudoaleatorio determinista: el seed produce siempre los mismos datos.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const money = (n: number) => n.toFixed(2);

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Usuario Demo',
      passwordHash: await hashPassword(DEMO_PASSWORD),
    },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
  });
  const categories = await prisma.category.findMany({ where: { userId: user.id } });

  const cat = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Categoría inexistente en el seed: ${name}`);
    return found.id;
  };

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const rows: Prisma.TransactionCreateManyInput[] = [];

  const addArs = (
    type: 'INCOME' | 'EXPENSE',
    category: string,
    amount: number,
    year: number,
    month: number,
    day: number,
    note: string,
  ) => {
    const date = Date.UTC(year, month, Math.min(Math.max(day, 1), 28));
    if (date > today) return; // no generamos movimientos futuros
    rows.push({
      type,
      amount: money(amount),
      currency: 'ARS',
      amountInBase: money(amount),
      date: new Date(date),
      note,
      userId: user.id,
      categoryId: cat(category),
    });
  };

  const addUsd = (
    category: string,
    usd: number,
    rate: number,
    year: number,
    month: number,
    day: number,
    note: string,
  ) => {
    const date = Date.UTC(year, month, Math.min(Math.max(day, 1), 28));
    if (date > today) return;
    rows.push({
      type: 'EXPENSE',
      amount: money(usd),
      currency: 'USD',
      exchangeRate: rate.toFixed(4),
      amountInBase: money(usd * rate),
      date: new Date(date),
      note,
      userId: user.id,
      categoryId: cat(category),
    });
  };

  for (let i = MONTHS - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const step = MONTHS - 1 - i; // 0 = mes más antiguo

    // Ingresos
    addArs('INCOME', 'Sueldo', 1_850_000 + step * 40_000, y, m, 5, 'Sueldo mensual');
    if (rand() > 0.45) {
      addArs(
        'INCOME',
        'Freelance',
        between(200_000, 450_000),
        y,
        m,
        between(15, 25),
        'Proyecto freelance',
      );
    }

    // Hogar y servicios
    addArs('EXPENSE', 'Hogar', 480_000 + step * 15_000, y, m, 3, 'Alquiler');
    addArs('EXPENSE', 'Servicios', between(28_000, 45_000), y, m, 8, 'Electricidad');
    addArs('EXPENSE', 'Servicios', between(35_000, 42_000), y, m, 10, 'Internet');
    addArs('EXPENSE', 'Servicios', between(12_000, 20_000), y, m, 12, 'Celular');

    // Comida: supermercado semanal + pedidos
    for (let w = 0; w < 4; w++) {
      addArs('EXPENSE', 'Comida', between(40_000, 95_000), y, m, 2 + w * 7, 'Supermercado');
    }
    for (let k = 0; k < between(3, 5); k++) {
      addArs('EXPENSE', 'Comida', between(12_000, 30_000), y, m, between(1, 28), 'Delivery');
    }

    // Transporte
    for (let k = 0; k < between(4, 6); k++) {
      addArs(
        'EXPENSE',
        'Transporte',
        between(5_000, 25_000),
        y,
        m,
        between(1, 28),
        'Viajes y SUBE',
      );
    }

    // Ocio y salud
    for (let k = 0; k < between(2, 4); k++) {
      addArs('EXPENSE', 'Ocio', between(15_000, 60_000), y, m, between(1, 28), 'Salida');
    }
    if (rand() > 0.5) {
      addArs(
        'EXPENSE',
        'Salud',
        between(20_000, 80_000),
        y,
        m,
        between(1, 28),
        'Consulta / farmacia',
      );
    }

    // Gastos en dólares (la cotización sube a lo largo de los meses)
    const rate = 1150 + step * 45;
    addUsd('Ocio', 10, rate, y, m, 14, 'Suscripción streaming');
    if (rand() > 0.6) {
      addUsd('Educación', 20, rate, y, m, 20, 'Curso online');
    }
  }

  await prisma.transaction.createMany({ data: rows });

  // Presupuestos del mes actual
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const budgets: [string, number][] = [
    ['Comida', 450_000],
    ['Transporte', 100_000],
    ['Ocio', 150_000],
    ['Servicios', 200_000],
    ['Salud', 100_000],
  ];
  await prisma.budget.createMany({
    data: budgets.map(([name, limit]) => ({
      month: currentMonth,
      limitAmount: money(limit),
      userId: user.id,
      categoryId: cat(name),
    })),
  });

  console.log(`Seed listo: ${rows.length} transacciones y ${budgets.length} presupuestos.`);
  console.log(`Usuario demo -> ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
