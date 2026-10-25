import type { ReactNode } from 'react';

interface RowActionsProps {
  /** Nombre del elemento, para que los lectores de pantalla sepan qué se edita o elimina. */
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Botones de editar y eliminar de una fila de lista. */
export function RowActions({ label, onEdit, onDelete, className = '' }: RowActionsProps) {
  return (
    <div className={`flex shrink-0 ${className}`}>
      <button type="button" className={iconButton} onClick={onEdit} aria-label={`Editar ${label}`}>
        <Icon>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </Icon>
      </button>
      <button
        type="button"
        className={iconButton}
        onClick={onDelete}
        aria-label={`Eliminar ${label}`}
      >
        <Icon>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </Icon>
      </button>
    </div>
  );
}
