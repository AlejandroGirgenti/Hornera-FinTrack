import { Prisma } from '@prisma/client';
import type {
  ByCategoryDto,
  ByCategoryQuery,
  MonthlyTrendPointDto,
  MonthlyTrendQuery,
  ReportPeriodDto,
  SummaryDto,
  SummaryQuery,
} from '@fintrack/shared';
import {
  addMonths,
  monthRange,
  monthsBack,
  resolvePeriod,
  toDbDate,
  todayInBuenosAires,
} from '../../lib/dates';
import { prisma } from '../../lib/prisma';

const zero = () => new Prisma.Decimal(0);

/**
 * Filtro base de todos los reportes: solo movimientos del usuario, sin los borrados lógicamente,
 * dentro del período. Los totales siempre suman `amountInBase` (moneda base del usuario).
 */
function baseWhere(userId: string, period: ReportPeriodDto): Prisma.TransactionWhereInput {
  return {
    userId,
    deletedAt: null,
    date: { gte: toDbDate(period.from), lte: toDbDate(period.to) },
  };
}

/** Ingresos, gastos y balance del período (por defecto, el mes en curso). */
export async function getSummary(userId: string, query: SummaryQuery): Promise<SummaryDto> {
  const period = resolvePeriod(query.from, query.to);

  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where: baseWhere(userId, period),
    _sum: { amountInBase: true },
    _count: { _all: true },
  });

  let income = zero();
  let expense = zero();
  let transactionCount = 0;
  for (const group of groups) {
    const total = group._sum.amountInBase ?? zero();
    if (group.type === 'INCOME') income = total;
    else expense = total;
    transactionCount += group._count._all;
  }

  return {
    period,
    income: income.toFixed(2),
    expense: expense.toFixed(2),
    balance: income.minus(expense).toFixed(2),
    transactionCount,
  };
}

/** Total por categoría del período, de mayor a menor, con su porcentaje sobre el total. */
export async function getByCategory(
  userId: string,
  query: ByCategoryQuery,
): Promise<ByCategoryDto> {
  const period = resolvePeriod(query.from, query.to);

  const groups = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { ...baseWhere(userId, period), type: query.type },
    _sum: { amountInBase: true },
    _count: { _all: true },
  });

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: groups.map((group) => group.categoryId) } },
    select: { id: true, name: true, color: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));

  const rows = groups.flatMap((group) => {
    const category = byId.get(group.categoryId);
    if (!category) return [];
    return [{ category, total: group._sum.amountInBase ?? zero(), count: group._count._all }];
  });

  const grandTotal = rows.reduce((sum, row) => sum.plus(row.total), zero());

  rows.sort(
    (a, b) => b.total.comparedTo(a.total) || a.category.name.localeCompare(b.category.name),
  );

  return {
    period,
    type: query.type,
    total: grandTotal.toFixed(2),
    items: rows.map((row) => ({
      category: row.category,
      total: row.total.toFixed(2),
      percentage: grandTotal.isZero()
        ? 0
        : row.total
            .div(grandTotal)
            .mul(100)
            .toDecimalPlaces(1, Prisma.Decimal.ROUND_HALF_UP)
            .toNumber(),
      transactionCount: row.count,
    })),
  };
}

interface TrendRow {
  month: string;
  kind: 'INCOME' | 'EXPENSE';
  total: Prisma.Decimal | string | number;
}

/**
 * Ingresos y gastos de cada uno de los últimos `months` meses (terminando en el mes en curso),
 * agrupados en la base de datos. Los meses sin movimientos aparecen en cero, así el gráfico
 * no tiene huecos.
 */
export async function getMonthlyTrend(
  userId: string,
  query: MonthlyTrendQuery,
): Promise<MonthlyTrendPointDto[]> {
  const currentMonth = todayInBuenosAires().slice(0, 7);
  const months = monthsBack(currentMonth, query.months);
  const from = `${addMonths(currentMonth, -(query.months - 1))}-01`;
  const to = monthRange(`${currentMonth}-01`).to;

  // Las fechas viajan como texto y se convierten con ::date en SQL: así no influye la zona
  // horaria de la sesión de la base.
  const rows = await prisma.$queryRaw<TrendRow[]>`
    SELECT
      to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
      "type"::text AS kind,
      SUM("amountInBase") AS total
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "deletedAt" IS NULL
      AND "date" >= ${from}::date
      AND "date" <= ${to}::date
    GROUP BY 1, 2
  `;

  const totals = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();
  for (const row of rows) {
    const entry = totals.get(row.month) ?? { income: zero(), expense: zero() };
    const amount = new Prisma.Decimal(row.total);
    if (row.kind === 'INCOME') entry.income = amount;
    else entry.expense = amount;
    totals.set(row.month, entry);
  }

  return months.map((month) => {
    const { income, expense } = totals.get(month) ?? { income: zero(), expense: zero() };
    return {
      month,
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      balance: income.minus(expense).toFixed(2),
    };
  });
}
