import type { ReactNode } from 'react';
import type { Currency, TransactionDto } from '@fintrack/shared';
import { formatDate, formatMoney } from '../../lib/format';

interface TransactionListProps {
  transactions: TransactionDto[];
  baseCurrency: Currency;
  onEdit: (transaction: TransactionDto) => void;
  onDelete: (transaction: TransactionDto) => void;
}

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function TransactionList({
  transactions,
  baseCurrency,
  onEdit,
  onDelete,
}: TransactionListProps) {
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === 'INCOME';
        const title = transaction.note ?? transaction.category.name;
        const foreign = transaction.currency !== baseCurrency;

        return (
          <li key={transaction.id} className="flex items-center gap-3 py-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: transaction.category.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {transaction.note ? `${transaction.category.name} · ` : ''}
                {formatDate(transaction.date)}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  isIncome
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="sr-only">{isIncome ? 'Ingreso de ' : 'Gasto de '}</span>
                {isIncome ? '+' : '−'}
                {formatMoney(transaction.amount, transaction.currency)}
              </p>
              {foreign && (
                <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  ≈ {formatMoney(transaction.amountInBase, baseCurrency)}
                </p>
              )}
            </div>
            <div className="flex shrink-0">
              <button
                type="button"
                className={iconButton}
                onClick={() => onEdit(transaction)}
                aria-label={`Editar ${title}`}
              >
                <Icon>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </Icon>
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => onDelete(transaction)}
                aria-label={`Eliminar ${title}`}
              >
                <Icon>
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </Icon>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
