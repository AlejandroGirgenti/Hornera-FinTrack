import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { formatMoney, formatShortDate } from '../../lib/format';
import { useSummary } from './useReports';

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'neutral' | 'negative';
}) {
  const colors = {
    income: 'text-emerald-600 dark:text-emerald-400',
    expense: 'text-rose-600 dark:text-rose-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-slate-900 dark:text-slate-100',
  };

  return (
    <Card>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${colors[tone]}`}>{value}</p>
    </Card>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </Card>
      ))}
    </div>
  );
}

export function SummaryCards({ month }: { month: string }) {
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useSummary(month);

  if (isPending) {
    return (
      <div role="status" aria-label="Cargando el resumen">
        <SkeletonCards />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorCard
        what="el resumen"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  }

  const balanceIsNegative = data.balance.startsWith('-');

  return (
    <section
      aria-label="Resumen del período"
      className={`space-y-3 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {formatShortDate(data.period.from)} al {formatShortDate(data.period.to)} ·{' '}
        {data.transactionCount === 1 ? '1 movimiento' : `${data.transactionCount} movimientos`}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMoney(data.income)} tone="income" />
        <StatCard label="Gastos" value={formatMoney(data.expense)} tone="expense" />
        <StatCard
          label="Balance"
          value={formatMoney(data.balance)}
          tone={balanceIsNegative ? 'negative' : 'neutral'}
        />
      </div>
      {data.transactionCount === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay movimientos en este período.
        </p>
      )}
    </section>
  );
}
