export interface DefaultCategory {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
}

/** Categorías que se crean automáticamente al registrar una cuenta. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Comida', type: 'EXPENSE', color: '#f97316' },
  { name: 'Transporte', type: 'EXPENSE', color: '#0ea5e9' },
  { name: 'Hogar', type: 'EXPENSE', color: '#8b5cf6' },
  { name: 'Servicios', type: 'EXPENSE', color: '#14b8a6' },
  { name: 'Salud', type: 'EXPENSE', color: '#ef4444' },
  { name: 'Ocio', type: 'EXPENSE', color: '#ec4899' },
  { name: 'Educación', type: 'EXPENSE', color: '#eab308' },
  { name: 'Otros gastos', type: 'EXPENSE', color: '#6b7280' },
  { name: 'Sueldo', type: 'INCOME', color: '#22c55e' },
  { name: 'Freelance', type: 'INCOME', color: '#10b981' },
  { name: 'Otros ingresos', type: 'INCOME', color: '#84cc16' },
];
