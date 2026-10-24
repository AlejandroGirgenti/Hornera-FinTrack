/** "2026-10-31" → "31/10/2026". */
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

interface ExportFilters {
  from?: string | undefined;
  to?: string | undefined;
  type?: 'INCOME' | 'EXPENSE' | undefined;
  q?: string | undefined;
}

/**
 * Texto legible con el período y los filtros aplicados, para el encabezado del Excel:
 * quien abra el archivo meses después tiene que poder saber qué incluye.
 */
export function describeFilters(filters: ExportFilters, categoryName?: string): string {
  const parts: string[] = [];

  if (filters.from && filters.to) {
    parts.push(`Período: ${formatIsoDate(filters.from)} al ${formatIsoDate(filters.to)}`);
  } else if (filters.from) {
    parts.push(`Período: desde el ${formatIsoDate(filters.from)}`);
  } else if (filters.to) {
    parts.push(`Período: hasta el ${formatIsoDate(filters.to)}`);
  } else {
    parts.push('Período: todo el historial');
  }

  if (filters.type) parts.push(`Tipo: ${filters.type === 'INCOME' ? 'ingresos' : 'gastos'}`);
  if (categoryName) parts.push(`Categoría: ${categoryName}`);
  if (filters.q) parts.push(`Búsqueda: "${filters.q}"`);

  return parts.join(' · ');
}
