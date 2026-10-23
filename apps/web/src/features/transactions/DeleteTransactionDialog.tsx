import { useState } from 'react';
import type { TransactionDto } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { formatDate, formatMoney } from '../../lib/format';
import { fromApiError } from '../auth/form-errors';
import { useDeleteTransaction } from './useTransactions';

interface DeleteTransactionDialogProps {
  transaction: TransactionDto;
  onDone: () => void;
}

export function DeleteTransactionDialog({ transaction, onDone }: DeleteTransactionDialogProps) {
  const remove = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    remove.mutate(transaction.id, {
      onSuccess: onDone,
      onError: (err) => setError(fromApiError(err).formError),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Vas a eliminar{' '}
        <strong className="font-semibold">
          {transaction.note ?? transaction.category.name} (
          {formatMoney(transaction.amount, transaction.currency)})
        </strong>{' '}
        del {formatDate(transaction.date)}. Esta acción no se puede deshacer.
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={confirm} loading={remove.isPending}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
