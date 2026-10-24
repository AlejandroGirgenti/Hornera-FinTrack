import type { Request, Response } from 'express';
import { usdRateQuerySchema } from '@fintrack/shared';
import { parseQuery } from '../../lib/validation';
import * as exchangeRatesService from './exchange-rates.service';

export async function usdRateHandler(req: Request, res: Response) {
  const { type } = parseQuery(usdRateQuerySchema, req.query);
  res.json({ data: await exchangeRatesService.getUsdRate(type) });
}
