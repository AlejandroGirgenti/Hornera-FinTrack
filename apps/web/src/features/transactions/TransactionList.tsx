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
    <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === 'INCOME';
        const title = transaction.note ?? transaction.category.name;
        const foreign = transaction.currency !== baseCurrency;

        return (
          <li
            key={transaction.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: transaction.category.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 wrap-break-word text-sm font-medium">{title}</p>
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
              className="col-span-3 -mb-1 -mt-0.5 justify-self-end sm:col-span-1 sm:m-0"
            />
          </li>
        );
      })}
    </ul>
  );
}
