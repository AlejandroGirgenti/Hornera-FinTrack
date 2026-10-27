import { useState } from 'react';
import type { FormEvent } from 'react';
import { setBudgetSchema } from '@fintrack/shared';
import type { BudgetItemDto, Currency } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { formatMonthLabel } from '../../lib/dates';
import { formatAmount } from '../../lib/format';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { normalizeNumberInput } from '../transactions/amount-input';
import { useRemoveBudget, useSetBudget } from './useBudgets';

interface BudgetLimitFormProps {
  item: BudgetItemDto;
  month: string;
  currency: Currency;
  onDone: () => void;
}

/** Define, cambia o quita el límite mensual de una categoría de gastos. */
export function BudgetLimitForm({ item, month, currency, onDone }: BudgetLimitFormProps) {
  const hasLimit = item.limit !== null;
  const setBudget = useSetBudget();
  const removeBudget = useRemoveBudget();
  const [limit, setLimit] = useState(item.limit ? String(Number(item.limit)) : '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Se valida con el mismo esquema que usa el servidor
    const parsed = setBudgetSchema.safeParse({
      categoryId: item.category.id,
      month,
      limitAmount: normalizeNumberInput(limit),
    });
    if (!parsed.success) {
      setErrors(fromIssues(parsed.error.issues));
      return;
    }
    setErrors({});

    setBudget.mutate(parsed.data, {
      onSuccess: onDone,
      onError: (error) => {
        const result = fromApiError(error);
        setErrors(result.fieldErrors);
        setFormError(result.formError);
      },
    });
  }

  function handleRemove() {
    setFormError(null);
    removeBudget.mutate(
      { categoryId: item.category.id, month },
      {
        onSuccess: onDone,
        onError: (error) => setFormError(fromApiError(error).formError),
      },
    );
  }

  const busy = setBudget.isPending || removeBudget.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: item.category.color }}
          aria-hidden="true"
        />
        <span className="font-medium">{item.category.name}</span>
        <span className="text-slate-500 capitalize dark:text-slate-400">
          · {formatMonthLabel(month)}
        </span>
      </div>

      <Field
        label="Límite mensual"
        inputMode="decimal"
        placeholder="0,00"
        value={limit}
        onChange={(event) => setLimit(event.target.value)}
        error={errors.limitAmount}
        hint={`En ${currency}. Este mes llevás gastado ${formatAmount(item.spent, currency)}.`}
        autoFocus
      />

      {formError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {hasLimit && (
          <Button
            type="button"
            variant="secondary"
            className="mr-auto"
            onClick={handleRemove}
            loading={removeBudget.isPending}
            disabled={busy}
          >
            Quitar límite
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onDone} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" loading={setBudget.isPending} disabled={busy}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
