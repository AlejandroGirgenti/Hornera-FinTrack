import { addMonths, currentMonth, formatMonthLabel } from '../../lib/dates';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

const navButton =
  'inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

function Chevron({ direction }: { direction: 'left' | 'right' }) {
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
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const today = currentMonth();
  const isCurrent = month >= today;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={navButton}
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mes anterior"
      >
        <Chevron direction="left" />
      </button>
      <p
        aria-live="polite"
        className="min-w-40 text-center text-sm font-semibold capitalize tabular-nums"
      >
        {formatMonthLabel(month)}
      </p>
      <button
        type="button"
        className={navButton}
        onClick={() => onChange(addMonths(month, 1))}
        disabled={isCurrent}
        aria-label="Mes siguiente"
      >
        <Chevron direction="right" />
      </button>
      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="rounded-lg px-2 py-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Mes actual
        </button>
      )}
    </div>
  );
}
