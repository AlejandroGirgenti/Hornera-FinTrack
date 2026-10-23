import { Button } from './Button';
import { Card } from './Card';

interface ErrorCardProps {
  /** Qué no se pudo cargar, por ejemplo "el resumen". */
  what: string;
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function ErrorCard({ what, message, onRetry, retrying = false }: ErrorCardProps) {
  return (
    <Card role="alert" className="space-y-3">
      <p className="text-sm text-rose-700 dark:text-rose-300">
        No se pudo cargar {what}
        {message ? `: ${message}` : '.'}
      </p>
      <Button variant="secondary" onClick={onRetry} loading={retrying}>
        Reintentar
      </Button>
    </Card>
  );
}
