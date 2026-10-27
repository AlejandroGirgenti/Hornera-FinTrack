import { useState } from 'react';
import type { ReactNode } from 'react';
import type { BudgetItemDto, BudgetStatus, Currency } from '@fintrack/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Modal } from '../../components/ui/Modal';
import { currentMonth, formatMonthLabel } from '../../lib/dates';
import { formatAmount, formatPercent } from '../../lib/format';
import { useAuth } from '../auth/AuthContext';
import { MonthPicker } from '../dashboard/MonthPicker';
import { BudgetLimitForm } from './BudgetLimitForm';
import {
  barWidth,
  remainingText,
  STATUS_BAR,
  STATUS_CHIP,
  STATUS_LABEL,
  STATUS_TEXT,
} from './budget-style';
import { useBudgets, useCopyBudgets } from './useBudgets';

function StatusChip({ status }: { status: BudgetStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ProgressBar({
  percent,
  status,
  label,
}: {
  percent: number;
  status: BudgetStatus;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(barWidth(percent))}
      className="h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10"
    >
      <div
        className={`h-full rounded-full transition-[width] ${STATUS_BAR[status]}`}
        style={{ width: `${barWidth(percent)}%` }}
      />
    </div>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CategoryName({ item }: { item: BudgetItemDto }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: item.category.color }}
        aria-hidden="true"
      />
      <span className="truncate font-medium">{item.category.name}</span>
    </span>
  );
}

function StatCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      {children}
    </Card>
  );
}

export function BudgetsPage() {
  const { user } = useAuth();
  const currency: Currency = user?.baseCurrency ?? 'ARS';
  const [month, setMonth] = useState(() => currentMonth());
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useBudgets(month);
  const copy = useCopyBudgets();
  const [editing, setEditing] = useState<BudgetItemDto | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'info'; text: string } | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  function changeMonth(next: string) {
    setMonth(next);
    setNotice(null);
    setCopyError(null);
  }

  function handleCopy() {
    setNotice(null);
    setCopyError(null);
    copy.mutate(month, {
      onSuccess: ({ from, copied }) =>
        setNotice(
          copied > 0
            ? {
                variant: 'success',
                text: `Se copiaron ${copied} ${copied === 1 ? 'límite' : 'límites'} de ${formatMonthLabel(from)}.`,
              }
            : {
                variant: 'info',
                text: `No había límites nuevos para copiar de ${formatMonthLabel(from)}.`,
              },
        ),
      onError: (err) => setCopyError(err.message),
    });
  }

  const totals = data?.totals;
  const hasBudgets = (data?.items.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Presupuestos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Poné un límite mensual a cada categoría de gastos y seguí cómo vas
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <MonthPicker month={month} onChange={changeMonth} />
          <Button variant="secondary" onClick={handleCopy} loading={copy.isPending}>
            Copiar del mes anterior
          </Button>
        </div>
      </div>

      {notice && <Alert variant={notice.variant}>{notice.text}</Alert>}
      {copyError && <Alert variant="error">{copyError}</Alert>}

      {isPending ? (
        <div role="status" aria-label="Cargando presupuestos" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Card key={item}>
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="mt-3 h-7 w-32 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
              </Card>
            ))}
          </div>
          <Card className="space-y-4">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-10 animate-pulse rounded bg-slate-200/70 dark:bg-white/10"
              />
            ))}
          </Card>
        </div>
      ) : isError ? (
        <ErrorCard
          what="los presupuestos"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <div className={`space-y-6 ${isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}>
          {hasBudgets && totals && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Presupuestado">
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatAmount(totals.budgeted, currency)}
                </p>
              </StatCard>
              <StatCard title="Gastado en esas categorías">
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatAmount(totals.spent, currency)}
                  {totals.percent !== null && (
                    <span
                      className={`ml-2 text-sm font-medium ${totals.status ? STATUS_TEXT[totals.status] : ''}`}
                    >
                      {formatPercent(totals.percent)}
                    </span>
                  )}
                </p>
                {totals.percent !== null && totals.status && (
                  <div className="mt-3">
                    <ProgressBar
                      percent={totals.percent}
                      status={totals.status}
                      label="Gastado del total presupuestado"
                    />
                  </div>
                )}
              </StatCard>
              <StatCard title="Te queda">
                <p
                  className={`mt-1 text-xl font-semibold tabular-nums ${
                    Number(totals.remaining) < 0 ? STATUS_TEXT.over : ''
                  }`}
                >
                  {Number(totals.remaining) < 0
                    ? `-${formatAmount(-Number(totals.remaining), currency)}`
                    : formatAmount(totals.remaining, currency)}
                </p>
              </StatCard>
            </div>
          )}

          {hasBudgets ? (
            <Card>
              <h2 className="text-base font-semibold">Categorías con límite</h2>
              <ul className="mt-4 space-y-5">
                {data.items.map((item) => (
                  <li key={item.category.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <CategoryName item={item} />
                        {item.status && <StatusChip status={item.status} />}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        aria-label={`Editar límite de ${item.category.name}`}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                      >
                        <EditIcon />
                      </button>
                    </div>
                    {item.percent !== null && item.status && item.limit && item.remaining && (
                      <>
                        <ProgressBar
                          percent={item.percent}
                          status={item.status}
                          label={`Gastado de ${item.category.name}`}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                          <span className="tabular-nums text-slate-600 dark:text-slate-300">
                            {formatAmount(item.spent, currency)} de{' '}
                            {formatAmount(item.limit, currency)} · {formatPercent(item.percent)}
                          </span>
                          <span className={`tabular-nums ${STATUS_TEXT[item.status]}`}>
                            {remainingText(item.remaining, currency)}
                          </span>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="space-y-2 text-center">
              <h2 className="text-base font-semibold">
                Todavía no definiste límites para{' '}
                <span className="capitalize">{formatMonthLabel(month)}</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Elegí una categoría de la lista de abajo para ponerle un límite, o copiá los del mes
                anterior.
              </p>
            </Card>
          )}

          {data.unbudgeted.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold">Sin presupuesto</h2>
              <ul className="mt-2 divide-y divide-slate-200/60 dark:divide-white/10">
                {data.unbudgeted.map((item) => (
                  <li
                    key={item.category.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <CategoryName item={item} />
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          Sin presupuesto
                        </span>
                      </div>
                      {Number(item.spent) > 0 && (
                        <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                          Gastaste {formatAmount(item.spent, currency)} este mes
                        </p>
                      )}
                    </div>
                    <Button variant="secondary" onClick={() => setEditing(item)}>
                      Definir límite
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!hasBudgets && data.unbudgeted.length === 0 && (
            <Card>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Todavía no tenés categorías de gastos. Creá una en la sección Categorías para poder
                ponerle un límite.
              </p>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.limit ? 'Editar límite' : 'Definir límite'}
      >
        {editing && (
          <BudgetLimitForm
            item={editing}
            month={month}
            currency={currency}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
