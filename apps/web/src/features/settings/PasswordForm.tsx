import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePasswordFormSchema } from '@fintrack/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { changePasswordRequest } from './settings-api';

/** Cambio de contraseña. Cierra las demás sesiones abiertas (otros dispositivos). */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({ mutationFn: changePasswordRequest });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    setFormError(null);

    const parsed = changePasswordFormSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setFieldErrors(fromIssues(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    // Repetir la contraseña solo se valida acá: no viaja a la API
    save.mutate(
      { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setSaved(true);
        },
        onError: (error) => {
          const result = fromApiError(error);
          setFieldErrors(result.fieldErrors);
          setFormError(result.formError);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}
      {saved && (
        <Alert variant="success">
          Listo, cambiaste tu contraseña. Cerramos tus sesiones en otros dispositivos.
        </Alert>
      )}

      <Field
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        error={fieldErrors['currentPassword']}
      />
      <Field
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        error={fieldErrors['newPassword']}
      />
      <Field
        label="Repetir contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={fieldErrors['confirmPassword']}
      />
      <Button type="submit" loading={save.isPending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
