import type { Request, Response } from 'express';
import { exportFormatQuerySchema, listTransactionsQuerySchema } from '@fintrack/shared';
import type { CreateTransactionInput, UpdateTransactionInput } from '@fintrack/shared';
import { notFound, unauthorized } from '../../lib/errors';
import { todayInBuenosAires } from '../../lib/dates';
import { parseQuery } from '../../lib/validation';
import { buildTransactionsCsv } from './transactions.csv';
import { describeFilters } from './transactions.export-text';
import { buildTransactionsWorkbook } from './transactions.xlsx';
import * as transactionsService from './transactions.service';

function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  return req.userId;
}

function transactionId(req: Request): string {
  const id = req.params.id;
  // En Express 5 un parámetro puede tipar como string | string[]; acá siempre es un string
  if (typeof id !== 'string' || !id) {
    throw notFound('TRANSACTION_NOT_FOUND', 'El movimiento no existe');
  }
  return id;
}

export async function listHandler(req: Request, res: Response) {
  const query = parseQuery(listTransactionsQuerySchema, req.query);
  res.json(await transactionsService.listTransactions(currentUserId(req), query));
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Descarga los movimientos filtrados (los mismos filtros que el listado) como CSV o como Excel,
 * según `?format=csv|xlsx`. Sin formato se entrega CSV.
 */
export async function exportHandler(req: Request, res: Response) {
  const query = parseQuery(listTransactionsQuerySchema, req.query);
  const { format } = parseQuery(exportFormatQuerySchema, req.query);
  const data = await transactionsService.getExportData(currentUserId(req), query);
  const filename = `movimientos-${todayInBuenosAires()}.${format}`;

  res.set('Content-Disposition', `attachment; filename="${filename}"`);

  if (format === 'xlsx') {
    const workbook = await buildTransactionsWorkbook({
      transactions: data.transactions,
      baseCurrency: data.baseCurrency,
      filtersDescription: describeFilters(query, data.categoryName),
      generatedAt: new Date(),
    });
    res.type(XLSX_MIME).send(workbook);
    return;
  }

  res.type('text/csv; charset=utf-8').send(buildTransactionsCsv(data.transactions));
}

export async function getHandler(req: Request, res: Response) {
  const data = await transactionsService.getTransaction(currentUserId(req), transactionId(req));
  res.json({ data });
}

export async function createHandler(req: Request, res: Response) {
  const data = await transactionsService.createTransaction(
    currentUserId(req),
    req.body as CreateTransactionInput,
  );
  res.status(201).json({ data });
}

export async function updateHandler(req: Request, res: Response) {
  const data = await transactionsService.updateTransaction(
    currentUserId(req),
    transactionId(req),
    req.body as UpdateTransactionInput,
  );
  res.json({ data });
}

export async function deleteHandler(req: Request, res: Response) {
  await transactionsService.deleteTransaction(currentUserId(req), transactionId(req));
  res.status(204).end();
}
