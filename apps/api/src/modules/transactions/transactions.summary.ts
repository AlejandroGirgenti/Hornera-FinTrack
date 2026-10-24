import type { TransactionDto } from '@fintrack/shared';

/**
 * Totales de un conjunto de movimientos, en moneda base. Se calcula con enteros (centavos) en
 * BigInt: sumar strings decimales como `Number` acumularía errores de punto flotante (0.1 + 0.2).
 */
export interface CategoryTotal {
  name: string;
  /** Total en centavos de la moneda base. */
  cents: bigint;
  count: number;
  /** Fracción del total de su tipo (0 a 1, con 4 decimales). */
  share: number;
}

export interface TransactionsSummary {
  count: number;
  income: bigint;
  expense: bigint;
  balance: bigint;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

/** "1500.50" → 150050n. Los montos de la API siempre vienen con 2 decimales. */
export function toCents(amount: string): bigint {
  const negative = amount.startsWith('-');
  const [whole = '0', fraction = ''] = amount.replace('-', '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}

/** Centavos → número con 2 decimales, listo para una celda numérica de Excel. */
export const centsToNumber = (cents: bigint): number => Number(cents) / 100;

function groupByCategory(transactions: readonly TransactionDto[], total: bigint): CategoryTotal[] {
  const groups = new Map<string, { cents: bigint; count: number }>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.category.name) ?? { cents: 0n, count: 0 };
    group.cents += toCents(transaction.amountInBase);
    group.count += 1;
    groups.set(transaction.category.name, group);
  }

  return [...groups.entries()]
    .map(([name, { cents, count }]) => ({
      name,
      cents,
      count,
      share: total > 0n ? Number((cents * 10000n) / total) / 10000 : 0,
    }))
    .sort((a, b) =>
      a.cents === b.cents ? a.name.localeCompare(b.name, 'es') : a.cents > b.cents ? -1 : 1,
    );
}

export function summarizeTransactions(
  transactions: readonly TransactionDto[],
): TransactionsSummary {
  const incomes = transactions.filter((transaction) => transaction.type === 'INCOME');
  const expenses = transactions.filter((transaction) => transaction.type === 'EXPENSE');
  const sum = (items: readonly TransactionDto[]) =>
    items.reduce((total, transaction) => total + toCents(transaction.amountInBase), 0n);

  const income = sum(incomes);
  const expense = sum(expenses);

  return {
    count: transactions.length,
    income,
    expense,
    balance: income - expense,
    incomeByCategory: groupByCategory(incomes, income),
    expenseByCategory: groupByCategory(expenses, expense),
  };
}
