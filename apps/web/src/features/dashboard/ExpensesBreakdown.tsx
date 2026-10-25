import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { formatMoney, formatPercent } from '../../lib/format';
import { useExpensesByCategory } from './useReports';

export function ExpensesBreakdown({ month }: { month: string }) {
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useExpensesByCategory(month);

  if (isPending) {
    return (
      <Card role="status" aria-label="Cargando gastos por categoría">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="mx-auto mt-6 size-48 animate-pulse rounded-full bg-slate-200/70 dark:bg-white/10" />
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorCard
        what="los gastos por categoría"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  }

  const chartData = data.items.map((item) => ({
    name: item.category.name,
    value: Number(item.total),
    color: item.category.color,
  }));

  return (
    <Card className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <h2 className="text-base font-semibold">Gastos por categoría</h2>

      {data.items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No hay gastos registrados en este mes.
        </p>
      ) : (
        <div className="mt-4 grid items-center gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
          {/* El gráfico es decorativo: la lista de al lado tiene los mismos datos, accesibles */}
          <div className="relative h-52" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-base font-semibold tabular-nums">
                {formatMoney(data.total)}
              </span>
            </div>
          </div>

          <ul className="space-y-2">
            {data.items.map((item) => (
              <li key={item.category.id} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.category.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word">{item.category.name}</p>
                  <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {formatPercent(item.percentage)}
                  </p>
                </div>
                <span className="whitespace-nowrap font-medium tabular-nums">
                  {formatMoney(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
