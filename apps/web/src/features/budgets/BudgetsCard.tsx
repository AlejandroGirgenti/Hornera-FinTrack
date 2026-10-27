import { Link } from 'react-router';
import type { Currency } from '@fintrack/shared';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { formatAmount, formatPercent } from '../../lib/format';
import { useAuth } from '../auth/AuthContext';
import { barWidth, remainingText, STATUS_BAR, STATUS_TEXT } from './budget-style';
import { useBudgets } from './useBudgets';

const MAX_ITEMS = 3;

/** Tarjeta del panel: las categorías que más cerca (o más allá) están de su límite. */
export function BudgetsCard({ month }: { month: string }) {
  const { user } = useAuth();
  const currency: Currency = user?.baseCurrency ?? 'ARS';
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useBudgets(month);

  if (isPending) {
    return (
      <Card role="status" aria-label="Cargando presupuestos">
        <div className="h-5 w-44 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="mt-6 space-y-5">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-9 animate-pulse rounded bg-slate-200/70 dark:bg-white/10"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorCard
        what="los presupuestos"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  }

  // Las más comprometidas primero
  const top = [...data.items]
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
    .slice(0, MAX_ITEMS);

  return (
    <Card className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Presupuestos del mes</h2>
        <Link
          to="/presupuestos"
          className="rounded text-sm font-medium text-accent-600 hover:underline dark:text-accent-300"
        >
          Ver todos
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No definiste límites para este mes.{' '}
          <Link
            to="/presupuestos"
            className="font-medium text-accent-600 hover:underline dark:text-accent-300"
          >
            Definir presupuestos
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {top.map((item) => (
            <li key={item.category.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.category.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">{item.category.name}</span>
                </span>
                {item.percent !== null && item.status && (
                  <span className={`shrink-0 font-medium tabular-nums ${STATUS_TEXT[item.status]}`}>
                    {formatPercent(item.percent)}
                  </span>
                )}
              </div>
              {item.percent !== null && item.status && item.limit && item.remaining && (
                <>
                  <div
                    role="progressbar"
                    aria-label={`Gastado de ${item.category.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(barWidth(item.percent))}
                    className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10"
                  >
                    <div
                      className={`h-full rounded-full ${STATUS_BAR[item.status]}`}
                      style={{ width: `${barWidth(item.percent)}%` }}
                    />
                  </div>
                  <p className="flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {formatAmount(item.spent, currency)} de {formatAmount(item.limit, currency)}
                    </span>
                    <span className={STATUS_TEXT[item.status]}>
                      {remainingText(item.remaining, currency)}
                    </span>
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
