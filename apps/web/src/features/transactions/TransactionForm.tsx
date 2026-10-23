import { useState } from 'react';
import type { FormEvent } from 'react';
import { createTransactionSchema, CURRENCIES, updateTransactionSchema } from '@fintrack/shared';
import type { Currency, TransactionDto, TransactionType } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { todayInBuenosAires } from '../../lib/dates';
import { formatMoney } from '../../lib/format';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { normalizeNumberInput } from './amount-input';
import { useCategories, useSaveTransaction } from './useTransactions';

interface TransactionFormProps {
  /** Movimiento a editar; sin él, el formulario crea uno nuevo. */
  transaction: TransactionDto | null;
  baseCurrency: Currency;
  onDone: () => void;
}

const TYPE_LABELS: Record<TransactionType, string> = { INCOME: 'Ingreso', EXPENSE: 'Gasto' };

export function TransactionForm({ transaction, baseCurrency, onDone }: TransactionFormProps) {
  const isEditing = transaction !== null;
  const categories = useCategories();
  const save = useSaveTransaction();

  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction?.amount ?? '');
  const [currency, setCurrency] = useState<Currency>(transaction?.currency ?? baseCurrency);
  const [rate, setRate] = useState(transaction?.exchangeRate ?? '');
  const [date, setDate] = useState(transaction?.date ?? todayInBuenosAires());
  const [categoryId, setCategoryId] = useState(transaction?.category.id ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const typeCategories = (categories.data ?? []).filter((category) => category.type === type);
  const needsRate = currency !== baseCurrency;

  // Equivalente aproximado en moneda base: solo orientativo, el servidor calcula el definitivo
  const preview = Number(normalizeNumberInput(amount)) * Number(normalizeNumberInput(rate));
  const showPreview = needsRate && Number.isFinite(preview) && preview > 0;

  function changeType(next: TransactionType) {
    setType(next);
    // La categoría tiene que ser del mismo tipo que el movimiento
    setCategoryId('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (needsRate && rate.trim() === '') {
      setErrors({ exchangeRate: 'Ingresá la cotización' });
      return;
    }

    const fields = {
      amount: normalizeNumberInput(amount),
      currency,
      exchangeRate: needsRate ? normalizeNumberInput(rate) : null,
      date,
      note,
      categoryId,
    };

    // Se valida con los mismos esquemas que usa el servidor
    const parsed = isEditing
      ? updateTransactionSchema.safeParse(fields)
      : createTransactionSchema.safeParse({ ...fields, type });
    if (!parsed.success) {
      setErrors(fromIssues(parsed.error.issues));
      return;
    }
    setErrors({});

    save.mutate(transaction ? { id: transaction.id, input: parsed.data } : { input: parsed.data }, {
      onSuccess: onDone,
      onError: (error) => {
        const result = fromApiError(error);
        setErrors(result.fieldErrors);
        setFormError(result.formError);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['EXPENSE', 'INCOME'] as const).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-500 ${
                type === value
                  ? value === 'INCOME'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              } ${isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                disabled={isEditing}
                onChange={() => changeType(value)}
                className="sr-only"
              />
              {TYPE_LABELS[value]}
            </label>
          ))}
        </div>
        {isEditing && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El tipo no se puede cambiar. Si te equivocaste, eliminá el movimiento y creá uno nuevo.
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field
          label="Monto"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
          autoFocus={!isEditing}
        />
        <Select
          label="Moneda"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
          error={errors.currency}
        >
          {CURRENCIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {needsRate && (
        <Field
          label="Cotización"
          inputMode="decimal"
          placeholder="1.200"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          error={errors.exchangeRate}
          hint={
            showPreview
              ? `${baseCurrency} por 1 ${currency}. Equivale a unos ${formatMoney(preview, baseCurrency)}`
              : `${baseCurrency} por 1 ${currency}. Se guarda con el movimiento.`
          }
        />
      )}

      <Field
        label="Fecha"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        error={errors.date}
      />

      <Select
        label="Categoría"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        error={errors.categoryId ?? errors.category}
        disabled={categories.isPending}
      >
        <option value="">{categories.isPending ? 'Cargando…' : 'Elegí una categoría'}</option>
        {typeCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      {categories.isError && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          No se pudieron cargar las categorías.{' '}
          <button type="button" className="underline" onClick={() => void categories.refetch()}>
            Reintentar
          </button>
        </p>
      )}
      {categories.isSuccess && typeCategories.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Todavía no tenés categorías de {type === 'INCOME' ? 'ingresos' : 'gastos'}.
        </p>
      )}

      <Field
        label="Nota (opcional)"
        maxLength={200}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={errors.note}
      />

      {formError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {isEditing ? 'Guardar cambios' : 'Crear movimiento'}
        </Button>
      </div>
    </form>
  );
}
