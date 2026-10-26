import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPasswordFormSchema } from '@fintrack/shared';
import { ApiError } from '../../lib/api';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { resetPasswordRequest } from './auth-api';
import { AuthLayout } from './AuthLayout';
import { fromApiError, fromIssues } from './form-errors';
import type { FieldErrors } from './form-errors';

const linkClass = 'font-medium text-accent-600 hover:underline dark:text-accent-300';

/** Pantalla a la que llega el enlace del correo: ahí se elige la contraseña nueva. */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = resetPasswordFormSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await resetPasswordRequest({ token, password: parsed.data.password });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        setTokenRejected(true);
      } else {
        const result = fromApiError(error);
        setFieldErrors(result.fieldErrors);
        setFormError(result.formError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Contraseña actualizada">
        <div className="space-y-4">
          <Alert variant="success">
            Listo, ya cambiaste tu contraseña. Por seguridad cerramos las sesiones que tenías
            abiertas.
          </Alert>
          <Button type="button" className="w-full" onClick={() => navigate('/login')}>
            Iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!token || tokenRejected) {
    return (
      <AuthLayout title="Enlace no válido">
        <div className="space-y-4">
          <Alert variant="error">
            El enlace no es válido o venció. Cada enlace sirve una sola vez y dura 1 hora.
          </Alert>
          <Button
            type="button"
            className="w-full"
            onClick={() => navigate('/olvide-mi-contrasena')}
          >
            Pedir un enlace nuevo
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className={linkClass}>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Elegí una contraseña nueva">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        <Field
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          autoFocus
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
        <Button type="submit" loading={submitting} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}
