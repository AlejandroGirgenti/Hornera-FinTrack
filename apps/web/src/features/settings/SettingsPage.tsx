import type { ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { AccentPicker } from './AccentPicker';
import { DeleteAccount } from './DeleteAccount';
import { EmailForm } from './EmailForm';
import { PasswordForm } from './PasswordForm';
import { ProfileForm } from './ProfileForm';

function Section({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={danger ? 'border-rose-300/70 dark:border-rose-500/30' : ''}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tus datos, tu seguridad y la apariencia de Hornera FinTrack
        </p>
      </div>

      <Section
        title="Datos personales"
        description="Tu nombre, tu país y la moneda de tus totales."
      >
        <ProfileForm />
      </Section>

      <Section title="Correo" description="El email con el que iniciás sesión.">
        <EmailForm />
      </Section>

      <Section
        title="Contraseña"
        description="Al cambiarla se cierran tus sesiones en otros dispositivos."
      >
        <PasswordForm />
      </Section>

      <Section
        title="Color de la aplicación"
        description="Cambia botones, enlaces, fondo y detalles. Se guarda en tu cuenta y te acompaña en todos tus dispositivos."
      >
        <AccentPicker />
      </Section>

      <Section
        danger
        title="Eliminar cuenta"
        description="Borra tu cuenta y todos tus datos de forma definitiva."
      >
        <DeleteAccount />
      </Section>
    </div>
  );
}
