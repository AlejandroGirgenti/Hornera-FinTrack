import { Prisma } from '@prisma/client';
import { budgetPercent, budgetStatus } from '@fintrack/shared';
import type {
  BudgetItemDto,
  BudgetsDto,
  BudgetTotalsDto,
  CopiedBudgetsDto,
  SavedBudgetDto,
  SetBudgetInput,
} from '@fintrack/shared';
import { addMonths, monthRange, toDbDate } from '../../lib/dates';
import { badRequest, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

const zero = () => new Prisma.Decimal(0);

/** Los presupuestos se guardan con el día 1 del mes (columna @db.Date). */
const monthStart = (month: string) => toDbDate(`${month}-01`);

/**
 * Estado de los presupuestos de un mes: cada categoría de gastos con lo que se gastó en el mes
 * (en la moneda base, como el resto de los reportes) y, si tiene, su límite.
 */
export async function getBudgets(userId: string, month: string): Promise<BudgetsDto> {
  const { from, to } = monthRange(`${month}-01`);

  const [categories, budgets, spending] = await Promise.all([
    prisma.category.findMany({
      where: { userId, type: 'EXPENSE' },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
    prisma.budget.findMany({ where: { userId, month: monthStart(month) } }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: { gte: toDbDate(from), lte: toDbDate(to) },
      },
      _sum: { amountInBase: true },
    }),
  ]);

  const limits = new Map(budgets.map((budget) => [budget.categoryId, budget.limitAmount]));
  const spentBy = new Map(spending.map((group) => [group.categoryId, group._sum.amountInBase]));

  let budgeted = zero();
  let spentInBudgeted = zero();
  const items: BudgetItemDto[] = [];
  const unbudgeted: BudgetItemDto[] = [];

  for (const category of categories) {
    const spent = spentBy.get(category.id) ?? zero();
    const limit = limits.get(category.id);

    if (!limit) {
      unbudgeted.push({
        category,
        limit: null,
        spent: spent.toFixed(2),
        remaining: null,
        percent: null,
        status: null,
      });
      continue;
    }

    budgeted = budgeted.plus(limit);
    spentInBudgeted = spentInBudgeted.plus(spent);
    items.push({
      category,
      limit: limit.toFixed(2),
      spent: spent.toFixed(2),
      remaining: limit.minus(spent).toFixed(2),
      percent: budgetPercent(spent.toFixed(2), limit.toFixed(2)),
      status: budgetStatus(spent.toFixed(2), limit.toFixed(2)),
    });
  }

  // Sin presupuesto: arriba lo que más se gastó
  unbudgeted.sort(
    (a, b) => Number(b.spent) - Number(a.spent) || a.category.name.localeCompare(b.category.name),
  );

  const hasBudgets = items.length > 0;
  const totals: BudgetTotalsDto = {
    budgeted: budgeted.toFixed(2),
    spent: spentInBudgeted.toFixed(2),
    remaining: budgeted.minus(spentInBudgeted).toFixed(2),
    percent: hasBudgets ? budgetPercent(spentInBudgeted.toFixed(2), budgeted.toFixed(2)) : null,
    status: hasBudgets ? budgetStatus(spentInBudgeted.toFixed(2), budgeted.toFixed(2)) : null,
  };

  return { month, totals, items, unbudgeted };
}

/** Fija o cambia el límite de una categoría de gastos para un mes. */
export async function setBudget(userId: string, input: SetBudgetInput): Promise<SavedBudgetDto> {
  // Siempre acotada al usuario: una categoría ajena responde igual que una inexistente
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId } });
  if (!category) throw notFound('CATEGORY_NOT_FOUND', 'La categoría no existe');
  if (category.type !== 'EXPENSE') {
    throw badRequest('BUDGET_ONLY_FOR_EXPENSES', 'Solo se puede poner un presupuesto a gastos');
  }

  const month = monthStart(input.month);
  const saved = await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId, categoryId: category.id, month } },
    create: { userId, categoryId: category.id, month, limitAmount: input.limitAmount },
    update: { limitAmount: input.limitAmount },
  });

  return {
    categoryId: saved.categoryId,
    month: input.month,
    limitAmount: saved.limitAmount.toFixed(2),
  };
}

/** Quita el límite de una categoría en un mes. Si no tenía, no pasa nada. */
export async function removeBudget(
  userId: string,
  categoryId: string,
  month: string,
): Promise<void> {
  await prisma.budget.deleteMany({ where: { userId, categoryId, month: monthStart(month) } });
}

/**
 * Copia los límites del mes anterior a `month`. No pisa los que ya estén cargados en `month`,
 * así se puede usar a mitad de mes sin perder lo que se haya ajustado.
 */
export async function copyFromPreviousMonth(
  userId: string,
  month: string,
): Promise<CopiedBudgetsDto> {
  const from = addMonths(month, -1);
  const source = await prisma.budget.findMany({ where: { userId, month: monthStart(from) } });

  const created =
    source.length === 0
      ? { count: 0 }
      : await prisma.budget.createMany({
          data: source.map((budget) => ({
            userId,
            categoryId: budget.categoryId,
            month: monthStart(month),
            limitAmount: budget.limitAmount,
          })),
          skipDuplicates: true,
        });

  return { from, copied: created.count };
}
