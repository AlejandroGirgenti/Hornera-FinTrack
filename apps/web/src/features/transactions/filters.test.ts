import { describe, expect, it } from 'vitest';
import { parseFilters, toApiQuery, toSearchParams } from './filters';
import type { TransactionFilters } from './filters';

const DEFAULT_MONTH = '2026-10';
const parse = (query: string) => parseFilters(new URLSearchParams(query), DEFAULT_MONTH);

describe('parseFilters', () => {
  it('sin parámetros usa el mes por defecto y nada más', () => {
    expect(parse('')).toEqual({ month: DEFAULT_MONTH, type: '', categoryId: '', q: '', page: 1 });
  });

  it('lee todos los filtros', () => {
    expect(parse('mes=2026-03&tipo=INCOME&categoria=abc&q=super&pagina=3')).toEqual({
      month: '2026-03',
      type: 'INCOME',
      categoryId: 'abc',
      q: 'super',
      page: 3,
    });
  });

  it('"todos" significa sin filtro de mes', () => {
    expect(parse('mes=todos').month).toBeNull();
  });

  it('descarta valores inválidos en vez de romper', () => {
    expect(parse('mes=2026-13').month).toBe(DEFAULT_MONTH);
    expect(parse('tipo=OTRO').type).toBe('');
    expect(parse('pagina=0').page).toBe(1);
    expect(parse('pagina=abc').page).toBe(1);
    expect(parse('pagina=2.5').page).toBe(1);
  });
});

describe('toSearchParams', () => {
  const base: TransactionFilters = {
    month: DEFAULT_MONTH,
    type: '',
    categoryId: '',
    q: '',
    page: 1,
  };

  it('no escribe nada cuando todo está por defecto', () => {
    expect(toSearchParams(base, DEFAULT_MONTH).toString()).toBe('');
  });

  it('hace ida y vuelta con parseFilters', () => {
    const filters: TransactionFilters = {
      month: null,
      type: 'EXPENSE',
      categoryId: 'c1',
      q: 'café con leche',
      page: 2,
    };
    const params = toSearchParams(filters, DEFAULT_MONTH);
    expect(parseFilters(params, DEFAULT_MONTH)).toEqual(filters);
  });
});

describe('toApiQuery', () => {
  it('convierte el mes en un rango de fechas', () => {
    const query = new URLSearchParams(
      toApiQuery({ month: '2026-02', type: '', categoryId: '', q: '', page: 1 }),
    );
    expect(query.get('from')).toBe('2026-02-01');
    expect(query.get('to')).toBe('2026-02-28');
    expect(query.get('page')).toBe('1');
    expect(query.get('pageSize')).toBe('15');
  });

  it('sin mes no manda fechas, y manda solo los filtros con valor', () => {
    const query = new URLSearchParams(
      toApiQuery({ month: null, type: 'EXPENSE', categoryId: '', q: '  ', page: 2 }),
    );
    expect(query.has('from')).toBe(false);
    expect(query.has('to')).toBe(false);
    expect(query.has('categoryId')).toBe(false);
    expect(query.has('q')).toBe(false);
    expect(query.get('type')).toBe('EXPENSE');
    expect(query.get('page')).toBe('2');
  });
});
