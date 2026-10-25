import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { AccentPicker } from './AccentPicker';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalizá la apariencia de Hornera FinTrack
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Color de la aplicación</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cambia botones, enlaces, fondo y detalles. Se guarda en tu cuenta y te acompaña en todos
          tus dispositivos.
        </p>
        <AccentPicker />
      </Card>

      {user && (
        <Card>
          <h2 className="text-base font-semibold">Tu cuenta</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Nombre</dt>
              <dd className="wrap-break-word font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Correo</dt>
              <dd className="break-all font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Moneda base</dt>
              <dd className="font-medium">{user.baseCurrency}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
