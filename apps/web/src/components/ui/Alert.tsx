import type { ReactNode } from 'react';

const styles = {
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  info: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-200',
};

/** Mensaje destacado dentro de un formulario o pantalla (error, éxito o información). */
export function Alert({
  variant,
  children,
}: {
  variant: keyof typeof styles;
  children: ReactNode;
}) {
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${styles[variant]}`}
    >
      {children}
    </p>
  );
}
