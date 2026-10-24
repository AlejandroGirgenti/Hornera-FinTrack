import { describe, expect, it } from 'vitest';
import type { TransactionDto } from '@fintrack/shared';
import { centsToNumber, summarizeTransactions, toCents } from './transactions.summary';

let sequence = 0;
const transaction = (
  type: 'INCOME' | 'EXPENSE',
  amountInBase: string,
  category: string,
): TransactionDto => ({
  id: `t${++sequence}`,
  type,
  amount: amountInBase,
  currency: 'ARS',
  exchangeRate: null,
  amountInBase,
  date: '2026-10-05',
  note: null,
  category: { id: category, name: category, color: '#6366f1' },
  createdAt: '2026-10-05T12:00:00.000Z',
});

describe('toCents / centsToNumber', () => {
  it('convierte montos decimales a centavos enteros', () => {
    expect(toCents('1500.50')).toBe(150050n);
    expect(toCents('0.05')).toBe(5n);
    expect(toCents('12')).toBe(1200n);
    expect(toCents('999999999999.99')).toBe(99999999999999n);
  });

  it('acepta negativos', () => {
    expect(toCents('-10.25')).toBe(-1025n);
  });

  it('vuelve a número con 2 decimales', () => {
    expect(centsToNumber(150050n)).toBe(1500.5);
    expect(centsToNumber(-5n)).toBe(-0.05);
  });
});

describe('summarizeTransactions', () => {
  it('sin movimientos devuelve todo en cero', () => {
    expect(summarizeTransactions([])).toEqual({
      count: 0,
      income: 0n,
      expense: 0n,
      balance: 0n,
      incomeByCategory: [],
      expenseByCategory: [],
    });
  });

  it('suma sin errores de punto flotante', () => {
    // Con Number, 0.1 + 0.2 da 0.30000000000000004
    const summary = summarizeTransactions([
      transaction('EXPENSE', '0.10', 'Comida'),
      transaction('EXPENSE', '0.20', 'Comida'),
    ]);
    expect(summary.expense).toBe(30n);
  });

  it('calcula ingresos, gastos y balance', () => {
    const summary = summarizeTransactions([
      transaction('INCOME', '100000.00', 'Sueldo'),
      transaction('EXPENSE', '1000.50', 'Comida'),
      transaction('EXPENSE', '2000.00', 'Transporte'),
    ]);
    expect(summary).toMatchObject({
      count: 3,
      income: 10000000n,
      expense: 300050n,
      balance: 9699950n,
    });
  });

  it('el balance puede ser negativo', () => {
    const summary = summarizeTransactions([
      transaction('INCOME', '100.00', 'Sueldo'),
      transaction('EXPENSE', '250.00', 'Comida'),
    ]);
    expect(summary.balance).toBe(-15000n);
  });

  it('agrupa por categoría, ordena de mayor a menor y calcula la proporción', () => {
    const summary = summarizeTransactions([
      transaction('EXPENSE', '100.00', 'Comida'),
      transaction('EXPENSE', '300.00', 'Alquiler'),
      transaction('EXPENSE', '100.00', 'Comida'),
      transaction('INCOME', '5000.00', 'Sueldo'),
    ]);

    expect(summary.expenseByCategory).toEqual([
      { name: 'Alquiler', cents: 30000n, count: 1, share: 0.6 },
      { name: 'Comida', cents: 20000n, count: 2, share: 0.4 },
    ]);
    expect(summary.incomeByCategory).toEqual([
      { name: 'Sueldo', cents: 500000n, count: 1, share: 1 },
    ]);
  });

  it('desempata por nombre cuando dos categorías suman lo mismo', () => {
    const summary = summarizeTransactions([
      transaction('EXPENSE', '50.00', 'Zapatos'),
      transaction('EXPENSE', '50.00', 'Café'),
    ]);
    expect(summary.expenseByCategory.map((item) => item.name)).toEqual(['Café', 'Zapatos']);
  });
});
