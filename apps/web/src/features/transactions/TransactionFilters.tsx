import { useEffect, useState } from 'react';
import { currentMonth } from '../../lib/dates';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useCategories } from '../categories/useCategories';
import { MonthPicker } from '../dashboard/MonthPicker';
import type { TransactionFilters as Filters } from './filters';

const TYPE_OPTIONS: { value: Filters['type']; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
];

interface TransactionFiltersProps {
  filters: Filters;
  /** Cambia solo los filtros indicados (la página vuelve a la 1 salvo que se indique otra). */
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  isFiltered: boolean;
}

export function TransactionFilters({
  filters,
  onChange,
  onReset,
  isFiltered,
}: TransactionFiltersProps) {
  const categories = useCategories();
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search, 300);

  // El texto se aplica recién cuando la persona deja de escribir, para no pedir datos en cada tecla
  useEffect(() => {
    if (debouncedSearch !== filters.q) onChange({ q: debouncedSearch });
  }, [debouncedSearch]);

  // Si los filtros se limpian desde afuera, el campo de búsqueda se vacía también
  useEffect(() => {
    if (filters.q === '') setSearch('');
  }, [filters.q]);

  const categoryOptions = (categories.data ?? []).filter(
    (category) => !filters.type || category.type === filters.type,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {filters.month ? (
          <MonthPicker month={filters.month} onChange={(month) => onChange({ month })} />
        ) : (
          <p className="text-sm font-semibold">Todo el historial</p>
        )}
        <button
          type="button"
          onClick={() => onChange({ month: filters.month ? null : currentMonth() })}
          className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-300"
        >
          {filters.month ? 'Ver todo el historial' : 'Filtrar por mes'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_10rem_12rem]">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <label htmlFor="buscar" className="sr-only">
            Buscar por nota o categoría
          </label>
          <input
            id="buscar"
            type="search"
            placeholder="Buscar por nota o categoría"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="block w-full rounded-lg border border-slate-300/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-black/30 dark:text-slate-100"
          />
        </div>
        <Select
          label="Tipo"
          hideLabel
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(type) => {
            // Si la categoría elegida es de otro tipo, deja de aplicar
            const keep = categoryOptions.some(
              (category) => category.id === filters.categoryId && (!type || category.type === type),
            );
            onChange({ type, categoryId: keep ? filters.categoryId : '' });
          }}
        />
        <Select
          label="Categoría"
          hideLabel
          value={filters.categoryId}
          options={[
            { value: '', label: 'Todas las categorías' },
            ...categoryOptions.map((category) => ({ value: category.id, label: category.name })),
          ]}
          onChange={(categoryId) => onChange({ categoryId })}
        />
      </div>

      {isFiltered && (
        <Button variant="secondary" onClick={onReset}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
