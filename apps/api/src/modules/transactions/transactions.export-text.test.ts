import { describe, expect, it } from 'vitest';
import { describeFilters, formatIsoDate } from './transactions.export-text';

describe('formatIsoDate', () => {
  it('pasa de AAAA-MM-DD a DD/MM/AAAA', () => {
    expect(formatIsoDate('2026-10-31')).toBe('31/10/2026');
  });
});

describe('describeFilters', () => {
  it('sin filtros indica que es todo el historial', () => {
    expect(describeFilters({})).toBe('Período: todo el historial');
  });

  it('describe el período y cada filtro aplicado', () => {
    expect(
      describeFilters(
        { from: '2026-10-01', to: '2026-10-31', type: 'EXPENSE', q: 'super' },
        'Comida',
      ),
    ).toBe(
      'Período: 01/10/2026 al 31/10/2026 · Tipo: gastos · Categoría: Comida · Búsqueda: "super"',
    );
  });

  it('describe un período abierto de un solo lado', () => {
    expect(describeFilters({ from: '2026-10-01' })).toBe('Período: desde el 01/10/2026');
    expect(describeFilters({ to: '2026-10-31' })).toBe('Período: hasta el 31/10/2026');
  });
});
