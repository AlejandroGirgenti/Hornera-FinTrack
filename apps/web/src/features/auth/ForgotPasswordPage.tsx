import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { forgotPasswordSchema } from '@fintrack/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { forgotPasswordRequest } from './auth-api';
import { AuthLayout } from './AuthLayout';
import { fromApiError, fromIssues } from './form-errors';
import type { FieldErrors } from './form-errors';

const linkClass = 'font-medium text-accent-600 hover:underline dark:text-accent-300';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await forgotPasswordRequest(parsed.data);
      setSentTo(parsed.data.email);
    } catch (error) {
      const result = fromApiError(error);
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Revisá tu correo">
        <div className="space-y-4">
          <Alert variant="success">
            Si <strong className="break-all">{sentTo}</strong> tiene una cuenta, te enviamos un
            enlace para elegir una contraseña nueva. Vence en 1 hora.
          </Alert>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Si no lo ves en unos minutos, mirá la carpeta de spam o{' '}
            <button type="button" onClick={() => setSentTo(null)} className={linkClass}>
              probá con otro email
            </button>
            .
          </p>
          <Link to="/login" className={`block text-center text-sm ${linkClass}`}>
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Recuperá tu contraseña">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingresá el email de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.
        </p>
        {formError && <Alert variant="error">{formError}</Alert>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors['email']}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Enviar enlace
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className={linkClass}>
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
