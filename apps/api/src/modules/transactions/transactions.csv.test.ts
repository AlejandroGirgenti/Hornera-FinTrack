import { describe, expect, it } from 'vitest';
import type { TransactionDto } from '@fintrack/shared';
import { buildTransactionsCsv, escapeCsvText } from './transactions.csv';

const transaction = (overrides: Partial<TransactionDto> = {}): TransactionDto => ({
  id: 't1',
  type: 'EXPENSE',
  amount: '45000.50',
  currency: 'ARS',
  exchangeRate: null,
  amountInBase: '45000.50',
  date: '2026-10-18',
  note: 'Supermercado',
  category: { id: 'c1', name: 'Comida', color: '#ef4444' },
  createdAt: '2026-10-18T12:00:00.000Z',
  ...overrides,
});

describe('escapeCsvText', () => {
  it('deja el texto simple sin tocar', () => {
    expect(escapeCsvText('Supermercado')).toBe('Supermercado');
    expect(escapeCsvText('')).toBe('');
  });

  it('entrecomilla cuando hay separador, comillas o saltos de línea', () => {
    expect(escapeCsvText('Pan; leche')).toBe('"Pan; leche"');
    expect(escapeCsvText('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(escapeCsvText('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
  });

  it('neutraliza las fórmulas que Excel ejecutaría al abrir el archivo', () => {
    expect(escapeCsvText('=SUMA(A1:A9)')).toBe("'=SUMA(A1:A9)");
    expect(escapeCsvText('+54 11 5555')).toBe("'+54 11 5555");
    expect(escapeCsvText('-cmd')).toBe("'-cmd");
    expect(escapeCsvText('@usuario')).toBe("'@usuario");
  });
});

describe('buildTransactionsCsv', () => {
  it('empieza con BOM y la fila de encabezados, y termina con salto de línea', () => {
    const csv = buildTransactionsCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toBe(
      '\uFEFFFecha;Tipo;Categoría;Nota;Monto;Moneda;Cotización;Monto en moneda base\r\n',
    );
  });

  it('escribe una fila por movimiento con decimales con coma', () => {
    const csv = buildTransactionsCsv([transaction()]);
    expect(csv.split('\r\n')[1]).toBe(
      '2026-10-18;Gasto;Comida;Supermercado;45000,50;ARS;;45000,50',
    );
  });

  it('incluye la cotización y el monto convertido de los movimientos en dólares', () => {
    const csv = buildTransactionsCsv([
      transaction({
        type: 'INCOME',
        amount: '100.00',
        currency: 'USD',
        exchangeRate: '1200.0000',
        amountInBase: '120000.00',
        note: null,
      }),
    ]);
    expect(csv.split('\r\n')[1]).toBe('2026-10-18;Ingreso;Comida;;100,00;USD;1200,0000;120000,00');
  });
});
