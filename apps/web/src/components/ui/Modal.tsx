import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Diálogo modal sobre el elemento nativo <dialog>: el navegador se encarga de atrapar el foco,
 * cerrar con Escape y bloquear el resto de la página. El contenido solo se monta mientras está
 * abierto, así los formularios arrancan limpios cada vez.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Un clic sobre el fondo oscuro (el propio <dialog>, no su contenido) cierra el diálogo
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="glass-strong m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 text-slate-900 backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:text-slate-100"
    >
      {open && (
        <div className="max-h-[90dvh] overflow-y-auto p-4 sm:p-5">
          <h2 id={titleId} className="mb-4 text-lg font-semibold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
