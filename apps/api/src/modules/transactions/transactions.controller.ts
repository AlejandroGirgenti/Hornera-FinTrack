import type { Request, Response } from 'express';
import { listTransactionsQuerySchema } from '@fintrack/shared';
import type { CreateTransactionInput, UpdateTransactionInput } from '@fintrack/shared';
import { badRequest, notFound, unauthorized } from '../../lib/errors';
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
  const query = listTransactionsQuerySchema.safeParse(req.query);
  if (!query.success) {
    const details = query.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw badRequest('VALIDATION_ERROR', 'Los filtros enviados no son válidos', details);
  }

  res.json(await transactionsService.listTransactions(currentUserId(req), query.data));
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
