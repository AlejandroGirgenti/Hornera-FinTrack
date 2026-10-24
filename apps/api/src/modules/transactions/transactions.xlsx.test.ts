import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { TransactionDto } from '@fintrack/shared';
import { buildTransactionsWorkbook } from './transactions.xlsx';

const generatedAt = new Date('2026-10-23T21:10:00Z');

const transaction = (overrides: Partial<TransactionDto>): TransactionDto => ({
  id: 't1',
  type: 'EXPENSE',
  amount: '1000.00',
  currency: 'ARS',
  exchangeRate: null,
  amountInBase: '1000.00',
  date: '2026-10-05',
  note: null,
  category: { id: 'c1', name: 'Comida', color: '#ef4444' },
  createdAt: '2026-10-05T12:00:00.000Z',
  ...overrides,
});

const sample = [
  transaction({
    id: 'a',
    type: 'INCOME',
    amount: '100000.00',
    amountInBase: '100000.00',
    category: { id: 'c2', name: 'Sueldo', color: '#22c55e' },
    date: '2026-10-01',
  }),
  transaction({ id: 'b', amount: '1500.50', amountInBase: '1500.50', note: 'Super; del barrio' }),
  transaction({
    id: 'c',
    amount: '20.00',
    currency: 'USD',
    exchangeRate: '1250.0000',
    amountInBase: '25000.00',
    category: { id: 'c3', name: 'Ocio', color: '#8b5cf6' },
    date: '2026-10-12',
  }),
];

async function load(transactions: readonly TransactionDto[]) {
  const buffer = await buildTransactionsWorkbook({
    transactions,
    baseCurrency: 'ARS',
    filtersDescription: 'Período: 01/10/2026 al 31/10/2026',
    generatedAt,
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return { buffer, workbook };
}

describe('buildTransactionsWorkbook', () => {
  it('genera un archivo xlsx válido con las hojas Resumen y Movimientos, en ese orden', async () => {
    const { buffer, workbook } = await load(sample);

    // Un .xlsx es un zip: empieza con "PK"
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Movimientos']);
  });

  it('escribe el encabezado y una fila por movimiento con valores numéricos', async () => {
    const { workbook } = await load(sample);
    const sheet = workbook.getWorksheet('Movimientos')!;

    expect(sheet.getRow(4).values).toEqual([
      undefined,
      'Fecha',
      'Tipo',
      'Categoría',
      'Nota',
      'Monto',
      'Moneda',
      'Cotización',
      'Monto en moneda base',
    ]);

    // Primera fila de datos: el ingreso de sueldo (se conserva el orden recibido)
    expect(sheet.getCell('B5').value).toBe('Ingreso');
    expect(sheet.getCell('C5').value).toBe('Sueldo');
    expect(sheet.getCell('E5').value).toBe(100000);
    expect(sheet.getCell('H5').value).toBe(100000);
    // La nota con punto y coma queda tal cual (en Excel no hace falta escaparla)
    expect(sheet.getCell('D6').value).toBe('Super; del barrio');
    // Movimiento en dólares: monto original, cotización y monto convertido
    expect(sheet.getCell('E7').value).toBe(20);
    expect(sheet.getCell('F7').value).toBe('USD');
    expect(sheet.getCell('G7').value).toBe(1250);
    expect(sheet.getCell('H7').value).toBe(25000);
    // Las fechas son fechas de verdad, no texto
    expect(sheet.getCell('A5').value).toEqual(new Date('2026-10-01T00:00:00Z'));
  });

  it('agrega totales y balance al pie con fórmulas y su resultado', async () => {
    const { workbook } = await load(sample);
    const sheet = workbook.getWorksheet('Movimientos')!;

    // 3 filas de datos (5 a 7), una fila en blanco y los totales en las filas 9, 10 y 11
    expect(sheet.getCell('G9').value).toBe('Total ingresos');
    expect(sheet.getCell('H9').value).toEqual({
      formula: 'SUMIF($B$5:$B$7,"Ingreso",$H$5:$H$7)',
      result: 100000,
    });
    expect(sheet.getCell('H10').value).toEqual({
      formula: 'SUMIF($B$5:$B$7,"Gasto",$H$5:$H$7)',
      result: 26500.5,
    });
    expect(sheet.getCell('G11').value).toBe('Balance');
    expect(sheet.getCell('H11').value).toEqual({ formula: 'H9-H10', result: 73499.5 });
  });

  it('la hoja Resumen muestra los totales y el detalle por categoría', async () => {
    const { workbook } = await load(sample);
    const sheet = workbook.getWorksheet('Resumen')!;

    expect(sheet.getCell('A4').value).toBe('Ingresos');
    expect(sheet.getCell('B4').value).toEqual({ formula: "'Movimientos'!H9", result: 100000 });
    expect(sheet.getCell('B5').value).toEqual({ formula: "'Movimientos'!H10", result: 26500.5 });
    expect(sheet.getCell('B6').value).toEqual({ formula: 'B4-B5', result: 73499.5 });
    expect(sheet.getCell('B7').value).toBe(3);

    // Gastos por categoría, de mayor a menor: Ocio (25000) y Comida (1500,50)
    expect(sheet.getCell('A9').value).toBe('Gastos por categoría');
    expect(sheet.getCell('A11').value).toBe('Ocio');
    expect(sheet.getCell('B11').value).toBe(25000);
    expect(sheet.getCell('A12').value).toBe('Comida');
    expect(sheet.getCell('B12').value).toBe(1500.5);
  });

  it('sin movimientos genera igual el archivo, con totales en cero', async () => {
    const { workbook } = await load([]);
    const detail = workbook.getWorksheet('Movimientos')!;
    const summary = workbook.getWorksheet('Resumen')!;

    expect(detail.getCell('H6').value).toBe(0); // total ingresos (sin filas no hay fórmula)
    expect(summary.getCell('B4').value).toBe(0);
    expect(summary.getCell('B7').value).toBe(0);
    expect(summary.getCell('A11').value).toBe('Sin movimientos');
  });

  it('muestra el período y los filtros en el encabezado', async () => {
    const { workbook } = await load(sample);
    const subtitle = String(workbook.getWorksheet('Movimientos')!.getCell('A2').value);

    expect(subtitle).toContain('Período: 01/10/2026 al 31/10/2026');
    expect(subtitle).toContain('Moneda base: ARS');
    expect(subtitle).toContain('23/10/2026');
  });
});
