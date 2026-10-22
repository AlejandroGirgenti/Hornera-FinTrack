import { z } from 'zod';
import { transactionTypeSchema } from './enums';
import type { TransactionType } from './enums';
import { isoDateSchema } from './transactions';

const periodFields = {
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
};

type PeriodQuery = { from?: string | undefined; to?: string | undefined };

/** Hay que enviar las dos fechas o ninguna (sin fechas se usa el mes en curso). */
const bothOrNone = (value: PeriodQuery) => Boolean(value.from) === Boolean(value.to);
const bothOrNoneError = {
  message: 'Enviá las fechas "desde" y "hasta" juntas, o ninguna para usar el mes en curso',
  path: ['from'],
};

const inOrder = (value: PeriodQuery) => !value.from || !value.to || value.from <= value.to;
const inOrderError = {
  message: 'La fecha "desde" no puede ser posterior a la fecha "hasta"',
  path: ['from'],
};

export const summaryQuerySchema = z
  .object(periodFields)
  .refine(bothOrNone, bothOrNoneError)
  .refine(inOrder, inOrderError);

export const byCategoryQuerySchema = z
  .object({ ...periodFields, type: transactionTypeSchema.default('EXPENSE') })
  .refine(bothOrNone, bothOrNoneError)
  .refine(inOrder, inOrderError);

export const MAX_TREND_MONTHS = 24;

export const monthlyTrendQuerySchema = z.object({
  months: z.coerce
    .number()
    .int('La cantidad de meses debe ser un número entero')
    .min(1, 'Pedí al menos 1 mes')
    .max(MAX_TREND_MONTHS, `Podés pedir hasta ${MAX_TREND_MONTHS} meses`)
    .default(6),
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type ByCategoryQuery = z.infer<typeof byCategoryQuerySchema>;
export type MonthlyTrendQuery = z.infer<typeof monthlyTrendQuerySchema>;

export interface ReportPeriodDto {
  from: string;
  to: string;
}

/** Los totales se calculan sobre `amountInBase`, es decir, en la moneda base del usuario. */
export interface SummaryDto {
  period: ReportPeriodDto;
  income: string;
  expense: string;
  balance: string;
  transactionCount: number;
}

export interface CategoryBreakdownItemDto {
  category: { id: string; name: string; color: string };
  total: string;
  /** Porcentaje del total del período, con 1 decimal. */
  percentage: number;
  transactionCount: number;
}

export interface ByCategoryDto {
  period: ReportPeriodDto;
  type: TransactionType;
  total: string;
  items: CategoryBreakdownItemDto[];
}

export interface MonthlyTrendPointDto {
  /** AAAA-MM */
  month: string;
  income: string;
  expense: string;
  balance: string;
}
