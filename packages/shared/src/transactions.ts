import { z } from 'zod';
import { currencySchema, transactionTypeSchema } from './enums';
import type { Currency, TransactionType } from './enums';
import { paginationQuerySchema } from './common';

const INVALID_DATE = 'La fecha no es válida (usá el formato AAAA-MM-DD)';

/** Fecha pura AAAA-MM-DD. Rechaza fechas inexistentes como 2026-02-30. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, INVALID_DATE)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, INVALID_DATE);

/**
 * Monto positivo con hasta 2 decimales (columna Decimal(14,2)).
 * Acepta número o string y siempre devuelve string: los montos nunca pasan por flotantes.
 */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, 'El monto debe ser positivo, con hasta 2 decimales')
      .refine((value) => Number(value) > 0, 'El monto debe ser mayor a 0'),
  );

/** Cotización positiva con hasta 4 decimales: unidades de moneda base por 1 de la moneda del movimiento. */
export const exchangeRateSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{1,10}(\.\d{1,4})?$/, 'La cotización debe ser positiva, con hasta 4 decimales')
      .refine((value) => Number(value) > 0, 'La cotización debe ser mayor a 0'),
  );

const noteSchema = z
  .string()
  .trim()
  .max(200, 'La nota no puede superar los 200 caracteres')
  .transform((value) => (value === '' ? null : value));

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  currency: currencySchema.default('ARS'),
  /** Obligatoria cuando la moneda del movimiento no es la moneda base del usuario. */
  exchangeRate: exchangeRateSchema.nullable().optional(),
  date: isoDateSchema,
  note: noteSchema.nullable().optional(),
  categoryId: z.string().min(1, 'La categoría es obligatoria'),
});

/**
 * El tipo (ingreso/gasto) no se puede cambiar: la categoría tiene que coincidir con él.
 * Para corregirlo se borra el movimiento y se crea de nuevo. El esquema es estricto.
 */
export const updateTransactionSchema = z
  .strictObject({
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    exchangeRate: exchangeRateSchema.nullable().optional(),
    date: isoDateSchema.optional(),
    note: noteSchema.nullable().optional(),
    categoryId: z.string().min(1, 'La categoría es obligatoria').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Enviá al menos un campo para modificar');

export const TRANSACTION_SORT_FIELDS = ['date', 'amount'] as const;

export const listTransactionsQuerySchema = paginationQuerySchema
  .extend({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    type: transactionTypeSchema.optional(),
    categoryId: z.string().min(1).optional(),
    /** Busca en la nota y en el nombre de la categoría, sin distinguir mayúsculas. */
    q: z.string().trim().max(100).optional(),
    sortBy: z.enum(TRANSACTION_SORT_FIELDS).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'La fecha "desde" no puede ser posterior a la fecha "hasta"',
    path: ['from'],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/** Transacción tal como la expone la API. Los montos viajan como string para no perder precisión. */
export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  exchangeRate: string | null;
  amountInBase: string;
  date: string;
  note: string | null;
  category: { id: string; name: string; color: string };
  createdAt: string;
}
