import type { Prisma } from '@prisma/client';
import { buildPaginationMeta } from '@fintrack/shared';
import type {
  CreateTransactionInput,
  Currency,
  ListTransactionsQuery,
  Paginated,
  TransactionDto,
  TransactionType,
  UpdateTransactionInput,
} from '@fintrack/shared';
import { badRequest, notFound, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { convertToBase } from './transactions.calc';

const include = {
  category: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TransactionInclude;

type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof include }>;

const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

function toDto(row: TransactionRow): TransactionDto {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    exchangeRate: row.exchangeRate ? row.exchangeRate.toFixed(4) : null,
    amountInBase: row.amountInBase.toFixed(2),
    date: row.date.toISOString().slice(0, 10),
    note: row.note,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

const transactionNotFound = () => notFound('TRANSACTION_NOT_FOUND', 'El movimiento no existe');

async function getBaseCurrency(userId: string): Promise<Currency> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  if (!user) throw unauthorized('INVALID_ACCESS_TOKEN', 'La cuenta ya no existe');
  return user.baseCurrency;
}

/**
 * La categoría tiene que ser del usuario y del mismo tipo que el movimiento. Si no existe o es de
 * otra cuenta se responde igual, para no revelar ids ajenos.
 */
async function assertCategory(userId: string, categoryId: string, type: TransactionType) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category || category.type !== type) {
    throw badRequest(
      'INVALID_CATEGORY',
      'La categoría no existe o no corresponde al tipo de movimiento',
    );
  }
}

/** Busca el movimiento siempre acotado al usuario y excluyendo los borrados lógicamente. */
async function findOwned(userId: string, id: string): Promise<TransactionRow> {
  const row = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include,
  });
  if (!row) throw transactionNotFound();
  return row;
}

function buildWhere(userId: string, query: ListTransactionsQuery): Prisma.TransactionWhereInput {
  const { from, to, type, categoryId, q } = query;

  return {
    userId,
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(from || to
      ? { date: { ...(from ? { gte: toDbDate(from) } : {}), ...(to ? { lte: toDbDate(to) } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { note: { contains: q, mode: 'insensitive' as const } },
            { category: { name: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
}

// Desempates fijos para que la paginación sea estable entre páginas
function buildOrderBy(
  sortBy: ListTransactionsQuery['sortBy'],
  order: ListTransactionsQuery['order'],
): Prisma.TransactionOrderByWithRelationInput[] {
  return [
    sortBy === 'amount' ? { amountInBase: order } : { date: order },
    { createdAt: order },
    { id: 'asc' },
  ];
}

export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<Paginated<TransactionDto>> {
  const { page, pageSize, sortBy, order } = query;
  const where = buildWhere(userId, query);

  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include,
      orderBy: buildOrderBy(sortBy, order),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: rows.map(toDto), meta: buildPaginationMeta(page, pageSize, total) };
}

/** Tope de filas por exportación: evita armar un archivo gigante en memoria. */
export const MAX_EXPORT_ROWS = 10_000;

/** Todos los movimientos que cumplen los filtros (sin paginar), hasta `MAX_EXPORT_ROWS`. */
export async function listAllForExport(
  userId: string,
  query: ListTransactionsQuery,
): Promise<TransactionDto[]> {
  const rows = await prisma.transaction.findMany({
    where: buildWhere(userId, query),
    include,
    orderBy: buildOrderBy(query.sortBy, query.order),
    take: MAX_EXPORT_ROWS,
  });
  return rows.map(toDto);
}

export interface ExportData {
  transactions: TransactionDto[];
  baseCurrency: Currency;
  /** Nombre de la categoría filtrada, si se filtró por una. */
  categoryName?: string;
}

/** Lo que necesita una exportación: los movimientos filtrados y el contexto para presentarlos. */
export async function getExportData(
  userId: string,
  query: ListTransactionsQuery,
): Promise<ExportData> {
  const [transactions, baseCurrency, category] = await Promise.all([
    listAllForExport(userId, query),
    getBaseCurrency(userId),
    query.categoryId
      ? prisma.category.findFirst({
          where: { id: query.categoryId, userId },
          select: { name: true },
        })
      : null,
  ]);
  return { transactions, baseCurrency, ...(category ? { categoryName: category.name } : {}) };
}

export async function getTransaction(userId: string, id: string): Promise<TransactionDto> {
  return toDto(await findOwned(userId, id));
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDto> {
  const [baseCurrency] = await Promise.all([
    getBaseCurrency(userId),
    assertCategory(userId, input.categoryId, input.type),
  ]);

  const conversion = convertToBase({
    amount: input.amount,
    currency: input.currency,
    baseCurrency,
    exchangeRate: input.exchangeRate,
  });

  const created = await prisma.transaction.create({
    data: {
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      exchangeRate: conversion.exchangeRate,
      amountInBase: conversion.amountInBase,
      date: toDbDate(input.date),
      note: input.note ?? null,
      userId,
      categoryId: input.categoryId,
    },
    include,
  });

  return toDto(created);
}

/**
 * Edita un movimiento. Si cambia el monto, la moneda o la cotización se recalcula `amountInBase`.
 * Al cambiar de moneda no se reutiliza la cotización anterior: hay que enviar la nueva.
 */
export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionDto> {
  const existing = await findOwned(userId, id);

  const categoryId = input.categoryId ?? existing.categoryId;
  if (input.categoryId) await assertCategory(userId, input.categoryId, existing.type);

  const currency = input.currency ?? existing.currency;
  const amount = input.amount ?? existing.amount.toFixed(2);
  const exchangeRate =
    input.exchangeRate !== undefined
      ? input.exchangeRate
      : currency === existing.currency
        ? (existing.exchangeRate?.toFixed(4) ?? null)
        : null;

  const conversion = convertToBase({
    amount,
    currency,
    baseCurrency: await getBaseCurrency(userId),
    exchangeRate,
  });

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      amount,
      currency,
      exchangeRate: conversion.exchangeRate,
      amountInBase: conversion.amountInBase,
      categoryId,
      ...(input.date ? { date: toDbDate(input.date) } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    },
    include,
  });

  return toDto(updated);
}

/** Borrado lógico: el movimiento deja de aparecer pero la fila se conserva. */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const result = await prisma.transaction.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) throw transactionNotFound();
}
