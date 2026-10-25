import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ExportFormat, TransactionDto } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { apiDownload } from '../../lib/api';
import { currentMonth } from '../../lib/dates';
import { saveBlob } from '../../lib/download';
import { useAuth } from '../auth/AuthContext';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransactionFilters } from './TransactionFilters';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { PAGE_SIZE, parseFilters, toApiQuery, toSearchParams } from './filters';
import type { TransactionFilters as Filters } from './filters';
import { useTransactionList } from './useTransactions';

type Dialog = { kind: 'closed' } | { kind: 'form'; transaction: TransactionDto | null };

export function TransactionsPage() {
  const { user } = useAuth();
  const baseCurrency = user?.baseCurrency ?? 'ARS';
  const defaultMonth = currentMonth();

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams, defaultMonth);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<TransactionDto | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useTransactionList(filters);

  function update(patch: Partial<Filters>) {
    const next = { ...filters, page: 1, ...patch };
    setSearchParams(toSearchParams(next, defaultMonth), { replace: true });
  }

  async function exportFile(format: ExportFormat) {
    setExporting(format);
    setExportError(null);
    try {
      // Se exportan todos los movimientos que cumplen los filtros actuales, no solo la página visible
      const params = new URLSearchParams(toApiQuery(filters, { paged: false }));
      params.set('format', format);
      const { blob, filename } = await apiDownload(`/transactions/export?${params.toString()}`);
      saveBlob(blob, filename ?? `movimientos.${format}`);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'No se pudo exportar los movimientos.',
      );
    } finally {
      setExporting(null);
    }
  }

  const isFiltered = Boolean(filters.type || filters.categoryId || filters.q);

  // Si se borra el último movimiento de la última página, se vuelve a la anterior
  const totalPages = data?.meta.totalPages;
  useEffect(() => {
    if (totalPages !== undefined && filters.page > totalPages) update({ page: totalPages });
  }, [totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Movimientos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tus ingresos y gastos, con filtros y búsqueda
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Button
            onClick={() => setDialog({ kind: 'form', transaction: null })}
            className="order-first col-span-2 sm:order-last sm:col-span-1"
          >
            Nuevo movimiento
          </Button>
          {(
            [
              { format: 'xlsx', label: 'Exportar Excel' },
              { format: 'csv', label: 'Exportar CSV' },
            ] as const
          ).map((option) => (
            <Button
              key={option.format}
              variant="secondary"
              onClick={() => void exportFile(option.format)}
              loading={exporting === option.format}
              disabled={exporting !== null || !data || data.meta.total === 0}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {exportError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {exportError}
        </p>
      )}

      <TransactionFilters
        filters={filters}
        onChange={update}
        onReset={() => setSearchParams({}, { replace: true })}
        isFiltered={isFiltered}
      />

      {isPending ? (
        <Card role="status" aria-label="Cargando movimientos" className="space-y-4">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-10 animate-pulse rounded bg-slate-200/70 dark:bg-white/10"
            />
          ))}
        </Card>
      ) : isError ? (
        <ErrorCard
          what="los movimientos"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <div className="space-y-4">
          <Card
            className={`py-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
            aria-busy={isPlaceholderData}
          >
            {data.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {isFiltered
                  ? 'No hay movimientos que coincidan con los filtros.'
                  : filters.month
                    ? 'No hay movimientos en este mes todavía.'
                    : 'Todavía no cargaste ningún movimiento.'}
              </p>
            ) : (
              <TransactionList
                transactions={data.data}
                baseCurrency={baseCurrency}
                onEdit={(transaction) => setDialog({ kind: 'form', transaction })}
                onDelete={setDeleting}
              />
            )}
          </Card>
          <Pagination
            page={data.meta.page}
            pageSize={PAGE_SIZE}
            total={data.meta.total}
            totalPages={data.meta.totalPages}
            onChange={(page) => update({ page })}
          />
        </div>
      )}

      <Modal
        open={dialog.kind === 'form'}
        onClose={() => setDialog({ kind: 'closed' })}
        title={
          dialog.kind === 'form' && dialog.transaction ? 'Editar movimiento' : 'Nuevo movimiento'
        }
      >
        {dialog.kind === 'form' && (
          <TransactionForm
            transaction={dialog.transaction}
            baseCurrency={baseCurrency}
            onDone={() => setDialog({ kind: 'closed' })}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Eliminar movimiento">
        {deleting && (
          <DeleteTransactionDialog transaction={deleting} onDone={() => setDeleting(null)} />
        )}
      </Modal>
    </div>
  );
}
