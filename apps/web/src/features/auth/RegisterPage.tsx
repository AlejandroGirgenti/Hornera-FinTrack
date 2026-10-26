import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { DEFAULT_COUNTRY, registerFormSchema } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { countryOptions } from '../../lib/countries';
import { useAuth } from './AuthContext';
import { AuthLayout } from './AuthLayout';
import { fromApiError, fromIssues } from './form-errors';
import type { FieldErrors } from './form-errors';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerFormSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      country,
    });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      // Repetir la contraseña solo se valida acá: no viaja a la API
      const { confirmPassword: _confirm, ...input } = parsed.data;
      await register(input);
      navigate('/', { replace: true });
    } catch (error) {
      const result = fromApiError(error);
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Creá tu cuenta">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          >
            {formError}
          </p>
        )}
        <Field
          label="Nombre"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors['name']}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors['email']}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, con al menos una letra y un número."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors['password']}
        />
        <Field
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors['confirmPassword']}
        />
        <Select
          label="País"
          value={country}
          options={countryOptions()}
          placeholder="Elegí tu país"
          onChange={setCountry}
          error={fieldErrors['country']}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Crear cuenta
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        ¿Ya tenés cuenta?{' '}
        <Link
          to="/login"
          className="font-medium text-accent-600 hover:underline dark:text-accent-300"
        >
          Iniciá sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
