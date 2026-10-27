import type { Request, Response } from 'express';
import { budgetsQuerySchema, removeBudgetQuerySchema } from '@fintrack/shared';
import type { CopyBudgetsInput, SetBudgetInput } from '@fintrack/shared';
import { unauthorized } from '../../lib/errors';
import { parseQuery } from '../../lib/validation';
import * as budgetsService from './budgets.service';

function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  return req.userId;
}

export async function getBudgetsHandler(req: Request, res: Response) {
  const { month } = parseQuery(budgetsQuerySchema, req.query);
  res.json({ data: await budgetsService.getBudgets(currentUserId(req), month) });
}

export async function setBudgetHandler(req: Request, res: Response) {
  const saved = await budgetsService.setBudget(currentUserId(req), req.body as SetBudgetInput);
  res.json({ data: saved });
}

export async function removeBudgetHandler(req: Request, res: Response) {
  const { categoryId, month } = parseQuery(removeBudgetQuerySchema, req.query);
  await budgetsService.removeBudget(currentUserId(req), categoryId, month);
  res.status(204).end();
}

export async function copyBudgetsHandler(req: Request, res: Response) {
  const { month } = req.body as CopyBudgetsInput;
  res.json({ data: await budgetsService.copyFromPreviousMonth(currentUserId(req), month) });
}
