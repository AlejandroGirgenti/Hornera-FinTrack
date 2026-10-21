import { z } from 'zod';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export const CURRENCIES = ['ARS', 'USD'] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export const currencySchema = z.enum(CURRENCIES);

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type Currency = z.infer<typeof currencySchema>;
