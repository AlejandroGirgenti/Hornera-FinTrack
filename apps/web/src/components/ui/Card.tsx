import type { HTMLAttributes } from 'react';

/** Tarjeta con efecto vidrio (ver .glass en index.css): deja ver el degradé de fondo. */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`glass rounded-2xl p-4 sm:p-5 ${className}`} />;
}
