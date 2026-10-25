import type { TransactionType } from '@fintrack/shared';

interface TypeToggleProps {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
  /** Cuando el tipo no se puede cambiar (al editar). */
  disabled?: boolean;
}

const OPTIONS = [
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'INCOME', label: 'Ingreso' },
] as const;

/** Selector de tipo (gasto o ingreso) como dos opciones excluyentes accesibles por teclado. */
export function TypeToggle({ value, onChange, disabled = false }: TypeToggleProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500 ${
              value === option.value
                ? option.value === 'INCOME'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'border-slate-300/80 text-slate-600 dark:border-white/10 dark:text-slate-300'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              name="type"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {disabled && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          El tipo no se puede cambiar. Si te equivocaste, eliminá y creá de nuevo.
        </p>
      )}
    </fieldset>
  );
}
