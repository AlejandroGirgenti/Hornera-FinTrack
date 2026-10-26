import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../auth/AuthContext';
import { fromApiError } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { DELETE_CONFIRMATION_WORD, isDeleteConfirmed } from './delete-confirmation';
import { deleteAccountRequest } from './settings-api';

type Step = 'closed' | 'warning' | 'confirm';

/**
 * Borrar la cuenta con todos sus datos, con doble confirmación:
 *  1) un aviso que explica qué se pierde y
 *  2) escribir ELIMINAR y la contraseña.
 */
export function DeleteAccount() {
  const { logout } = useAuth();
  const [step, setStep] = useState<Step>('closed');
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const remove = useMutation({ mutationFn: deleteAccountRequest });

  function close() {
    if (remove.isPending) return;
    setStep('closed');
    setConfirmation('');
    setPassword('');
    setFieldErrors({});
    setFormError(null);
    remove.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!isDeleteConfirmed(confirmation)) return;
    if (!password) {
      setFieldErrors({ password: 'Ingresá tu contraseña' });
      return;
    }
    setFieldErrors({});

    remove.mutate(
      { password },
      {
        // La cuenta ya no existe: se cierra la sesión local y la app lleva al login
        onSuccess: () => void logout(),
        onError: (error) => {
          const result = fromApiError(error);
          setFieldErrors(result.fieldErrors);
          setFormError(result.formError);
        },
      },
    );
  }

  return (
    <>
      <Button variant="danger" onClick={() => setStep('warning')}>
        Eliminar mi cuenta
      </Button>

      <Modal
        open={step !== 'closed'}
        onClose={close}
        title={step === 'confirm' ? 'Confirmá para eliminar' : '¿Eliminar tu cuenta?'}
      >
        {step === 'warning' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Vas a borrar tu cuenta y <strong>todo lo que cargaste</strong>:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Todos tus movimientos y categorías</li>
              <li>Tus datos personales y tus sesiones abiertas</li>
            </ul>
            <Alert variant="error">Esta acción es definitiva: no se puede deshacer.</Alert>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={close}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => setStep('confirm')}>
                Sí, quiero eliminarla
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <Field
              label={`Escribí ${DELETE_CONFIRMATION_WORD} para confirmar`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <Field
              label="Tu contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors['password']}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={remove.isPending}
                disabled={!isDeleteConfirmed(confirmation)}
              >
                Eliminar definitivamente
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
