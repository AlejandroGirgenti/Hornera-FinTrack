import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CURRENCIES, updateProfileSchema } from '@fintrack/shared';
import type { Currency } from '@fintrack/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api';
import { countryOptions } from '../../lib/countries';
import { useAuth } from '../auth/AuthContext';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { updateProfileRequest } from './settings-api';

const CURRENCY_LABELS: Record<Currency, string> = {
  ARS: 'Pesos argentinos (ARS)',
  USD: 'Dólares (USD)',
};

const currencyOptions = CURRENCIES.map((value) => ({ value, label: CURRENCY_LABELS[value] }));

/** Nombre, país y moneda base. Solo se envía lo que cambió. */
export function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [baseCurrency, setBaseCurrency] = useState<Currency>(user?.baseCurrency ?? 'ARS');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({ mutationFn: updateProfileRequest });

  if (!user) return null;

  // Lo que cambió respecto de lo guardado
  const patch: Record<string, string> = {};
  if (name.trim() !== user.name) patch['name'] = name;
  if (country && country !== user.country) patch['country'] = country;
  if (baseCurrency !== user.baseCurrency) patch['baseCurrency'] = baseCurrency;
  const dirty = Object.keys(patch).length > 0;

  function edited() {
    setSaved(false);
    setFormError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    edited();

    const parsed = updateProfileSchema.safeParse(patch);
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    save.mutate(parsed.data, {
      onSuccess: (updated) => {
        updateUser(updated);
        setSaved(true);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'BASE_CURRENCY_LOCKED') {
          setFieldErrors({ baseCurrency: error.message });
          return;
        }
        const result = fromApiError(error);
        setFieldErrors(result.fieldErrors);
        setFormError(result.formError);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}
      {saved && <Alert variant="success">Listo, guardamos tus datos.</Alert>}

      <Field
        label="Nombre"
        autoComplete="name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          edited();
        }}
        error={fieldErrors['name']}
      />
      <Select
        label="País"
        value={country}
        options={countryOptions()}
        placeholder="Elegí tu país"
        onChange={(value) => {
          setCountry(value);
          edited();
        }}
        error={fieldErrors['country']}
      />
      <div className="space-y-1">
        <Select
          label="Moneda base"
          value={baseCurrency}
          options={currencyOptions}
          onChange={(value) => {
            setBaseCurrency(value);
            edited();
          }}
          error={fieldErrors['baseCurrency']}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Es la moneda en la que se suman tus totales. Solo se puede cambiar mientras no tengas
          movimientos cargados.
        </p>
      </div>

      <Button type="submit" loading={save.isPending} disabled={!dirty}>
        Guardar cambios
      </Button>
    </form>
  );
}
