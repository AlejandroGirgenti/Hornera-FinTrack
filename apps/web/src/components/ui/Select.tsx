import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { findByInitial, nextIndex } from './select-keys';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label: string;
  /** Oculta la etiqueta visualmente pero la mantiene para lectores de pantalla. */
  hideLabel?: boolean;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  /** Texto que se muestra cuando el valor actual no coincide con ninguna opción. */
  placeholder?: string;
  error?: string | undefined;
  disabled?: boolean;
  className?: string;
}

/** Alto de cada opción (cómodo para el dedo) y cantidad que se ve sin desplazarse. */
const OPTION_HEIGHT = 44;
const VISIBLE_OPTIONS = 6;

/**
 * Selector desplegable propio. El <select> nativo no deja darle estilo a la lista que se abre (en
 * el navegador queda gris y con la tipografía del sistema), así que acá la lista es un listbox
 * accesible con el mismo aspecto de vidrio que el resto de la app: se maneja con el mouse, el
 * dedo y el teclado (flechas, Inicio, Fin, Enter, Escape y la primera letra).
 *
 * La lista se muestra en la capa superior del navegador (atributo popover). Así no la recorta el
 * diálogo que contiene al formulario ni el desplazamiento de la página, y se abre hacia arriba
 * si abajo no hay lugar.
 */
export function Select<T extends string>({
  label,
  hideLabel = false,
  value,
  onChange,
  options,
  placeholder = '',
  error,
  disabled = false,
  className = '',
}: SelectProps<T>) {
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const errorId = `${baseId}-error`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function openList() {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Ubica la lista pegada al botón y la muestra en la capa superior
  useLayoutEffect(() => {
    const list = listRef.current;
    const button = buttonRef.current;
    if (!open || !list || !button) return;

    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const openUp = below < 200 && above > below;
    const wanted = Math.min(options.length, VISIBLE_OPTIONS) * OPTION_HEIGHT + 8;

    list.style.position = 'fixed';
    list.style.left = `${rect.left}px`;
    list.style.width = `${rect.width}px`;
    list.style.right = 'auto';
    list.style.maxHeight = `${Math.max(OPTION_HEIGHT + 8, Math.min(wanted, openUp ? above : below))}px`;
    list.style.top = openUp ? 'auto' : `${rect.bottom + 4}px`;
    list.style.bottom = openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto';

    if (typeof list.showPopover === 'function') list.showPopover();
    return () => {
      if (typeof list.hidePopover === 'function' && list.matches(':popover-open')) {
        list.hidePopover();
      }
    };
  }, [open, options.length]);

  // Se cierra al tocar afuera, al desplazar la página o al cambiar el tamaño de la ventana
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !listRef.current?.contains(target)) close();
    };
    const onScroll = (event: Event) => {
      if (!listRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Mantiene a la vista la opción activa al moverse con el teclado
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        // Sin esto, Escape también cerraría el diálogo que contiene al selector
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (active >= 0) choose(active);
        break;
      case 'Tab':
        setOpen(false);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End':
        event.preventDefault();
        setActive(nextIndex(active, event.key, options.length));
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const found = findByInitial(
            options.map((option) => option.label),
            event.key,
            active,
          );
          if (found >= 0) setActive(found);
        }
    }
  }

  return (
    <div className="space-y-1">
      <label
        id={labelId}
        htmlFor={buttonId}
        className={
          hideLabel ? 'sr-only' : 'block text-sm font-medium text-slate-700 dark:text-slate-300'
        }
      >
        {label}
      </label>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${buttonId}`}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white/70 px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-black/40 ${
          error ? 'border-rose-500' : 'border-slate-300/80 dark:border-white/10'
        } ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          popover="manual"
          // Evita que tocar una opción le saque el foco al botón
          onMouseDown={(event) => event.preventDefault()}
          className="glass-strong m-0 overflow-y-auto rounded-xl p-1 text-slate-900 dark:text-slate-100"
        >
          {options.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              No hay opciones
            </li>
          )}
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                  index === active ? 'bg-accent-500/15' : ''
                } ${isSelected ? 'font-semibold text-accent-700 dark:text-accent-300' : ''}`}
              >
                <span className="min-w-0 wrap-break-word">{option.label}</span>
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
