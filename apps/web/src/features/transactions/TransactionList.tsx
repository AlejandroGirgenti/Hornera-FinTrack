import type { Currency, TransactionDto } from '@fintrack/shared';
import { RowActions } from '../../components/ui/RowActions';
import { formatDate, formatMoney } from '../../lib/format';

interface TransactionListProps {
  transactions: TransactionDto[];
  baseCurrency: Currency;
  onEdit: (transaction: TransactionDto) => void;
  onDelete: (transaction: TransactionDto) => void;
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
            <RowActions
              label={title}
              onEdit={() => onEdit(transaction)}
              onDelete={() => onDelete(transaction)}
            />
          </li>
        );
      })}
    </ul>
  );
}
