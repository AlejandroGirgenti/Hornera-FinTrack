import { useState } from 'react';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_COLOR,
  HEX_COLOR_PATTERN,
  isReadableAccent,
} from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { fromApiError } from '../auth/form-errors';
import { useAuth } from '../auth/AuthContext';
import { useUpdateAccent } from './useUpdateProfile';

/** Mensaje para un color escrito a mano, o null si se puede usar. */
export function customColorError(value: string): string | null {
  if (!HEX_COLOR_PATTERN.test(value)) return 'Escribilo como #rrggbb, por ejemplo #4a2b8a';
  if (!isReadableAccent(value))
    return 'Elegí un color más oscuro para que el texto blanco se lea bien';
  return null;
}

export function AccentPicker() {
  const { user } = useAuth();
  const save = useUpdateAccent();
  const current = (user?.accentColor ?? DEFAULT_ACCENT_COLOR).toLowerCase();
  const isDefault = current === DEFAULT_ACCENT_COLOR;

  const [custom, setCustom] = useState(current);
  const [touched, setTouched] = useState(false);

  const customError = touched ? customColorError(custom) : null;
  const serverError = save.isError ? fromApiError(save.error).formError : null;

  function choose(color: string | null) {
    save.mutate({ accentColor: color });
    setCustom(color ?? DEFAULT_ACCENT_COLOR);
    setTouched(false);
  }

  function applyCustom() {
    setTouched(true);
    if (customColorError(custom) === null) choose(custom.toLowerCase());
  }

  const pickerValue = HEX_COLOR_PATTERN.test(custom) ? custom.toLowerCase() : current;

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Colores sugeridos" className="grid gap-2 sm:grid-cols-2">
        {ACCENT_PRESETS.map((preset) => {
          const selected = preset.value === current;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={save.isPending}
              onClick={() => choose(preset.value === DEFAULT_ACCENT_COLOR ? null : preset.value)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:opacity-60 ${
                selected
                  ? 'border-accent-500 bg-accent-500/10 font-medium'
                  : 'border-slate-300/70 bg-white/40 hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              <span
                aria-hidden="true"
                className="size-6 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                style={{ backgroundColor: preset.value }}
              />
              <span className="flex-1">{preset.name}</span>
              {selected && (
                <span className="text-xs text-accent-600 dark:text-accent-300">En uso</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Otro color</h3>
        <div className="flex flex-wrap items-start gap-2">
          <input
            type="color"
            aria-label="Elegir un color"
            value={pickerValue}
            onChange={(event) => {
              setCustom(event.target.value);
              setTouched(true);
            }}
            className="size-10 shrink-0 cursor-pointer rounded-lg border border-slate-300/70 bg-white/60 p-1 dark:border-white/10 dark:bg-white/5"
          />
          <div className="min-w-32 flex-1">
            <Field
              label="Código del color"
              value={custom}
              onChange={(event) => {
                setCustom(event.target.value.trim());
                setTouched(true);
              }}
              error={customError ?? undefined}
              hint="Los colores muy claros se rechazan: los botones llevan texto blanco"
              maxLength={7}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={save.isPending}
            onClick={applyCustom}
            className="mt-6"
          >
            Usar este color
          </Button>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {serverError}
        </p>
      )}
      {save.isSuccess && !save.isPending && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Listo, guardamos tu color.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10">
        <span className="text-sm text-slate-500 dark:text-slate-400">Vista previa:</span>
        <span className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white">
          Botón
        </span>
        <span className="rounded-full bg-accent-500/15 px-3 py-1 text-sm font-medium text-accent-700 dark:text-accent-300">
          Etiqueta
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={isDefault || save.isPending}
          onClick={() => choose(null)}
          className="ml-auto"
        >
          Volver a Midnight purple
        </Button>
      </div>
    </div>
  );
}
