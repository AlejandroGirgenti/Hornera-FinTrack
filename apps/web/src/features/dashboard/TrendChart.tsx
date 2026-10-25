import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { formatMonthLabel, formatMonthShort } from '../../lib/dates';
import { formatCompact, formatMoney } from '../../lib/format';
import { useMonthlyTrend } from './useReports';

const INCOME_COLOR = '#10b981';
const EXPENSE_COLOR = '#f43f5e';

export function TrendChart() {
  const { data, isPending, isError, error, refetch, isFetching } = useMonthlyTrend(6);

  if (isPending) {
    return (
      <Card role="status" aria-label="Cargando la evolución mensual">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="mt-6 h-52 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorCard
        what="la evolución mensual"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  }

  const chartData = data.map((point) => ({
    month: point.month,
    label: formatMonthShort(point.month),
    income: Number(point.income),
    expense: Number(point.expense),
  }));
  const hasData = chartData.some((point) => point.income > 0 || point.expense > 0);

  return (
    <Card>
      <h2 className="text-base font-semibold">Ingresos y gastos</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Últimos 6 meses</p>

      {!hasData ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay movimientos en los últimos meses.
        </p>
      ) : (
        <>
          <div className="mt-4 h-64 text-slate-500 dark:text-slate-400" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.2} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatCompact(value)}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'currentColor', fillOpacity: 0.08 }}
                  formatter={(value) => formatMoney(Number(value))}
                  labelFormatter={(_label, payload) => {
                    const month = payload?.[0]?.payload?.month;
                    return typeof month === 'string' ? formatMonthLabel(month) : '';
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg)',
                    borderColor: 'var(--chart-tooltip-border)',
                    color: 'var(--chart-tooltip-text)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'var(--chart-tooltip-text)', textTransform: 'capitalize' }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="income"
                  name="Ingresos"
                  fill={INCOME_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expense"
                  name="Gastos"
                  fill={EXPENSE_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Equivalente accesible del gráfico para lectores de pantalla */}
          <table className="sr-only">
            <caption>Ingresos y gastos de los últimos 6 meses</caption>
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th scope="col">Ingresos</th>
                <th scope="col">Gastos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.month}>
                  <th scope="row">{formatMonthLabel(point.month)}</th>
                  <td>{formatMoney(point.income)}</td>
                  <td>{formatMoney(point.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
