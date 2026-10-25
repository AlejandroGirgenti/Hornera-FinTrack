import type { ReactNode } from 'react';
import { Logo } from '../../components/Logo';
import { Card } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

const FEATURES = [
  'Un panel con gráficos de tus ingresos y gastos, mes a mes',
  'Movimientos en pesos o dólares, con la cotización automática',
  'Categorías con tus propios colores',
  'Exportá a Excel con totales y balance',
];

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 size-5 shrink-0 text-accent-600 dark:text-accent-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Pantalla de ingreso: a la izquierda de qué trata la app, a la derecha la tarjeta de vidrio con
 * el formulario. En celulares se apilan. El degradé de fondo viene de index.css (body::before).
 */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <section className="space-y-6 text-center lg:text-left">
          <Logo markClassName="size-14" className="gap-3 text-2xl" />
          <p className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Construí tus finanzas{' '}
            <span className="text-accent-600 dark:text-accent-300">palito a palito</span>
          </p>
          <p className="mx-auto max-w-md text-base text-slate-600 lg:mx-0 dark:text-slate-300">
            Como el hornero con su nido: registrá cada ingreso y cada gasto, y mirá cómo se arma tu
            panorama completo.
          </p>
          <ul className="hidden max-w-md space-y-3 text-left text-sm text-slate-700 lg:block dark:text-slate-200">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-3">
                <Check />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        <main className="mx-auto w-full max-w-md">
          <Card className="p-6 sm:p-8">
            <h1 className="mb-6 text-xl font-semibold">{title}</h1>
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
}
