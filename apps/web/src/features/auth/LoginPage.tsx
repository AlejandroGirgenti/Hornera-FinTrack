import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginSchema } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { useAuth } from './AuthContext';
import { AuthLayout } from './AuthLayout';
import { fromApiError, fromIssues } from './form-errors';
import type { FieldErrors } from './form-errors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Se valida con el mismo esquema que usa la API (paquete compartido)
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await login(parsed.data);
      navigate(from, { replace: true });
    } catch (error) {
      const result = fromApiError(error);
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Iniciá sesión">
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors['password']}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        ¿No tenés cuenta?{' '}
        <Link
          to="/registro"
          className="font-medium text-accent-600 hover:underline dark:text-accent-300"
        >
          Registrate
        </Link>
      </p>
    </AuthLayout>
  );
}
