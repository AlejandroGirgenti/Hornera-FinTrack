import type { Request, Response } from 'express';
import {
  byCategoryQuerySchema,
  monthlyTrendQuerySchema,
  summaryQuerySchema,
} from '@fintrack/shared';
import { unauthorized } from '../../lib/errors';
import { parseQuery } from '../../lib/validation';
import * as reportsService from './reports.service';

function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  return req.userId;
}

export async function summaryHandler(req: Request, res: Response) {
  const query = parseQuery(summaryQuerySchema, req.query);
  res.json({ data: await reportsService.getSummary(currentUserId(req), query) });
}

export async function byCategoryHandler(req: Request, res: Response) {
  const query = parseQuery(byCategoryQuerySchema, req.query);
  res.json({ data: await reportsService.getByCategory(currentUserId(req), query) });
}

export async function monthlyTrendHandler(req: Request, res: Response) {
  const query = parseQuery(monthlyTrendQuerySchema, req.query);
  res.json({ data: await reportsService.getMonthlyTrend(currentUserId(req), query) });
}
