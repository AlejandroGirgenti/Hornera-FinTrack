import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | undefined;
  /** Oculta la etiqueta visualmente pero la mantiene para lectores de pantalla. */
  hideLabel?: boolean;
}

export function Select({
  label,
  error,
  hideLabel = false,
  className = '',
  children,
  ...select
}: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={
          hideLabel ? 'sr-only' : 'block text-sm font-medium text-slate-700 dark:text-slate-300'
        }
      >
        {label}
      </label>
      <select
        {...select}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:bg-slate-900 dark:text-slate-100 ${
          error ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
        } ${className}`}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
