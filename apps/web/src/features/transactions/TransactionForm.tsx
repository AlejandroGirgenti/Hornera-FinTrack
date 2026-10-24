import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createTransactionSchema,
  CURRENCIES,
  updateTransactionSchema,
  USD_RATE_TYPES,
} from '@fintrack/shared';
import type { Currency, TransactionDto, TransactionType } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { TypeToggle } from '../../components/ui/TypeToggle';
import { todayInBuenosAires } from '../../lib/dates';
import { formatDateTime, formatMoney } from '../../lib/format';
import { fromApiError, fromIssues } from '../auth/form-errors';
import { useCategories } from '../categories/useCategories';
import type { FieldErrors } from '../auth/form-errors';
import { normalizeNumberInput } from './amount-input';
import { USD_RATE_LABELS, canAutoRate } from './exchange-rate';
import type { RateSource } from './exchange-rate';
import { useSaveTransaction } from './useTransactions';
import { useUsdRate } from './useUsdRate';

interface TransactionFormProps {
  /** Movimiento a editar; sin él, el formulario crea uno nuevo. */
  transaction: TransactionDto | null;
  baseCurrency: Currency;
  onDone: () => void;
}

export function TransactionForm({ transaction, baseCurrency, onDone }: TransactionFormProps) {
  const isEditing = transaction !== null;
  const categories = useCategories();
  const save = useSaveTransaction();

  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction?.amount ?? '');
  const [currency, setCurrency] = useState<Currency>(transaction?.currency ?? baseCurrency);
  const [rate, setRate] = useState(transaction?.exchangeRate ?? '');
  // Al editar se respeta la cotización guardada; al crear se propone la del dólar oficial
  const [rateSource, setRateSource] = useState<RateSource>(isEditing ? 'manual' : 'oficial');
  const [date, setDate] = useState(transaction?.date ?? todayInBuenosAires());
  const [categoryId, setCategoryId] = useState(transaction?.category.id ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const typeCategories = (categories.data ?? []).filter((category) => category.type === type);
  const needsRate = currency !== baseCurrency;

  // Cotización automática: se consulta solo si corresponde y la persona no eligió ingresarla a mano
  const autoRate = needsRate && canAutoRate(baseCurrency, currency) && rateSource !== 'manual';
  const usdRate = useUsdRate(rateSource === 'manual' ? 'oficial' : rateSource, autoRate);
  useEffect(() => {
    if (autoRate && usdRate.data) setRate(usdRate.data.sell);
  }, [autoRate, usdRate.data]);

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
      <TypeToggle value={type} onChange={changeType} disabled={isEditing} />

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
          onChange={(event) => {
            const next = event.target.value as Currency;
            setCurrency(next);
            // Al pasar a dólares sin cotización cargada, se propone la automática
            if (canAutoRate(baseCurrency, next) && rate.trim() === '') setRateSource('oficial');
          }}
          error={errors.currency}
        >
          {CURRENCIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {needsRate && canAutoRate(baseCurrency, currency) && (
        <Select
          label="Tipo de dólar"
          value={rateSource}
          onChange={(event) => setRateSource(event.target.value as RateSource)}
        >
          {USD_RATE_TYPES.map((value) => (
            <option key={value} value={value}>
              {USD_RATE_LABELS[value]}
            </option>
          ))}
          <option value="manual">Ingresar la cotización a mano</option>
        </Select>
      )}

      {needsRate && (
        <Field
          label="Cotización"
          inputMode="decimal"
          placeholder="1.200"
          value={rate}
          onChange={(event) => {
            setRate(event.target.value);
            // Si la persona la escribe, deja de pisarse con la automática
            setRateSource('manual');
          }}
          error={errors.exchangeRate}
          hint={[
            `${baseCurrency} por 1 ${currency}.`,
            autoRate && usdRate.isFetching && 'Buscando la cotización…',
            autoRate &&
              usdRate.isError &&
              'No se pudo obtener la cotización automática: ingresala a mano.',
            autoRate &&
              usdRate.data &&
              `Precio de venta, actualizado ${formatDateTime(usdRate.data.updatedAt)}.`,
            showPreview && `Equivale a unos ${formatMoney(preview, baseCurrency)}.`,
          ]
            .filter(Boolean)
            .join(' ')}
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
