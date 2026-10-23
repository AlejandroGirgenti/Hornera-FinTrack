import { useState } from 'react';
import type { CategoryDto, TransactionType } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Modal } from '../../components/ui/Modal';
import { RowActions } from '../../components/ui/RowActions';
import { CategoryForm } from './CategoryForm';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { useCategories } from './useCategories';

type Dialog =
  { kind: 'closed' } | { kind: 'form'; category: CategoryDto | null; type: TransactionType };

const SECTIONS: { type: TransactionType; title: string; empty: string }[] = [
  { type: 'EXPENSE', title: 'Gastos', empty: 'Todavía no tenés categorías de gastos.' },
  { type: 'INCOME', title: 'Ingresos', empty: 'Todavía no tenés categorías de ingresos.' },
];

export function CategoriesPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useCategories();
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organizá tus ingresos y gastos; el color se usa en los gráficos
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: 'form', category: null, type: 'EXPENSE' })}>
          Nueva categoría
        </Button>
      </div>

      {isPending ? (
        <Card role="status" aria-label="Cargando categorías" className="space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-8 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ))}
        </Card>
      ) : isError ? (
        <ErrorCard
          what="las categorías"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((section) => {
            const items = data.filter((category) => category.type === section.type);
            return (
              <Card key={section.type} className="py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{section.title}</h2>
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'form', category: null, type: section.type })}
                    className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Agregar
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{section.empty}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((category) => (
                      <li key={category.id} className="flex items-center gap-3 py-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {category.name}
                        </span>
                        <RowActions
                          label={category.name}
                          onEdit={() => setDialog({ kind: 'form', category, type: category.type })}
                          onDelete={() => setDeleting(category)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={dialog.kind === 'form'}
        onClose={() => setDialog({ kind: 'closed' })}
        title={dialog.kind === 'form' && dialog.category ? 'Editar categoría' : 'Nueva categoría'}
      >
        {dialog.kind === 'form' && (
          <CategoryForm
            category={dialog.category}
            initialType={dialog.type}
            onDone={() => setDialog({ kind: 'closed' })}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Eliminar categoría">
        {deleting && <DeleteCategoryDialog category={deleting} onDone={() => setDeleting(null)} />}
      </Modal>
    </div>
  );
}
