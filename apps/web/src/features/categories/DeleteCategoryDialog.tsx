import { useState } from 'react';
import type { CategoryDto } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { fromApiError } from '../auth/form-errors';
import { useDeleteCategory } from './useCategories';

interface DeleteCategoryDialogProps {
  category: CategoryDto;
  onDone: () => void;
}

export function DeleteCategoryDialog({ category, onDone }: DeleteCategoryDialogProps) {
  const remove = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    remove.mutate(category.id, {
      onSuccess: onDone,
      // Si tiene movimientos, la API explica por qué no se puede eliminar
      onError: (err) => setError(fromApiError(err).formError),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Vas a eliminar la categoría <strong className="font-semibold">{category.name}</strong>. Solo
        se puede eliminar si no tiene movimientos asociados.
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
