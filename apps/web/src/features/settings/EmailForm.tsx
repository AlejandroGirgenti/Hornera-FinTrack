import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changeEmailSchema } from '@fintrack/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { changeEmailRequest } from './settings-api';

/** Cambio de correo: pide la contraseña actual para confirmar que sos vos. */
export function EmailForm() {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({ mutationFn: changeEmailRequest });

  if (!user) return null;
  const changed = email.trim().toLowerCase() !== user.email;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    setFormError(null);

    const parsed = changeEmailSchema.safeParse({ email, currentPassword });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    save.mutate(parsed.data, {
      onSuccess: (updated) => {
        updateUser(updated);
        setEmail(updated.email);
        setCurrentPassword('');
        setSaved(true);
      },
      onError: (error) => {
        const result = fromApiError(error);
        // "Ya existe una cuenta con ese email" va junto al campo del correo
        if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
          setFieldErrors({ email: error.message });
        } else {
          setFieldErrors(result.fieldErrors);
          setFormError(result.formError);
        }
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}
      {saved && <Alert variant="success">Listo, cambiamos tu correo.</Alert>}

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setSaved(false);
        }}
        error={fieldErrors['email']}
      />
      {changed && (
        <Field
          label="Tu contraseña actual"
          type="password"
          autoComplete="current-password"
          hint="La pedimos para confirmar que sos vos."
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={fieldErrors['currentPassword']}
        />
      )}
      <Button type="submit" loading={save.isPending} disabled={!changed}>
        Cambiar correo
      </Button>
    </form>
  );
}
