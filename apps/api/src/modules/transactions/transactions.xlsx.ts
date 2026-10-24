import ExcelJS from 'exceljs';
import type { Currency, TransactionDto } from '@fintrack/shared';
import { centsToNumber, summarizeTransactions } from './transactions.summary';
import type { CategoryTotal } from './transactions.summary';

/**
 * Exportación a Excel (.xlsx) con dos hojas:
 * - "Resumen": ingresos, gastos y balance, y el detalle por categoría.
 * - "Movimientos": la tabla completa con filtros, totales y balance al pie.
 *
 * Los totales de las dos hojas son fórmulas de Excel (con el resultado ya calculado), así que si
 * la persona edita o borra filas, los números se recalculan solos.
 */

const COLORS = {
  brand: 'FF4F46E5',
  brandLight: 'FFEEF2FF',
  white: 'FFFFFFFF',
  text: 'FF0F172A',
  muted: 'FF64748B',
  income: 'FF059669',
  expense: 'FFE11D48',
  band: 'FFF8FAFC',
  line: 'FFE2E8F0',
} as const;

const SHEET_DETAIL = 'Movimientos';
const SHEET_SUMMARY = 'Resumen';
const HEADER_ROW = 4;
const FIRST_DATA_ROW = HEADER_ROW + 1;

const HEADERS = [
  { title: 'Fecha', width: 12 },
  { title: 'Tipo', width: 10 },
  { title: 'Categoría', width: 22 },
  { title: 'Nota', width: 36 },
  { title: 'Monto', width: 16 },
  { title: 'Moneda', width: 9 },
  { title: 'Cotización', width: 13 },
  { title: 'Monto en moneda base', width: 22 },
] as const;
const LAST_COLUMN = HEADERS.length;

const CURRENCY_SYMBOL: Record<Currency, string> = { ARS: '$', USD: 'US$' };

/** Formato de moneda de Excel: los negativos salen en rojo. */
const moneyFormat = (currency: Currency) => {
  const symbol = `"${CURRENCY_SYMBOL[currency]}"`;
  return `${symbol} #,##0.00;[Red]-${symbol} #,##0.00`;
};

const solid = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

const thinBottom = (argb: string): Partial<ExcelJS.Borders> => ({
  bottom: { style: 'thin', color: { argb } },
});

export interface WorkbookOptions {
  transactions: readonly TransactionDto[];
  /** Moneda en la que se calculan los totales. */
  baseCurrency: Currency;
  /** Texto con el período y los filtros aplicados. */
  filtersDescription: string;
  generatedAt: Date;
}

const generatedLabel = (date: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);

function writeTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: COLORS.brand } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 10, color: { argb: COLORS.muted } };
  subtitleCell.alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(2).height = 30;
}

function writeDetailSheet(
  sheet: ExcelJS.Worksheet,
  { transactions, baseCurrency, filtersDescription, generatedAt }: WorkbookOptions,
  totals: { income: number; expense: number; balance: number },
) {
  HEADERS.forEach((header, index) => {
    sheet.getColumn(index + 1).width = header.width;
  });

  writeTitle(
    sheet,
    'FinTrack · Movimientos',
    `${filtersDescription} · Moneda base: ${baseCurrency} · Generado el ${generatedLabel(generatedAt)}`,
    LAST_COLUMN,
  );

  const headerRow = sheet.getRow(HEADER_ROW);
  HEADERS.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header.title;
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = solid(COLORS.brand);
    cell.alignment = {
      vertical: 'middle',
      horizontal: index >= 4 && index !== 5 ? 'right' : 'left',
      wrapText: true,
    };
  });
  headerRow.height = 24;

  transactions.forEach((transaction, index) => {
    const row = sheet.getRow(FIRST_DATA_ROW + index);
    const isIncome = transaction.type === 'INCOME';
    const color = { argb: isIncome ? COLORS.income : COLORS.expense };

    row.getCell(1).value = new Date(`${transaction.date}T00:00:00Z`);
    row.getCell(1).numFmt = 'dd/mm/yyyy';
    row.getCell(1).alignment = { horizontal: 'left' };
    row.getCell(2).value = isIncome ? 'Ingreso' : 'Gasto';
    row.getCell(2).font = { bold: true, color };
    row.getCell(3).value = transaction.category.name;
    row.getCell(4).value = transaction.note ?? '';
    row.getCell(5).value = Number(transaction.amount);
    row.getCell(5).numFmt = moneyFormat(transaction.currency);
    row.getCell(6).value = transaction.currency;
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).value =
      transaction.exchangeRate === null ? null : Number(transaction.exchangeRate);
    row.getCell(7).numFmt = '#,##0.0000';
    row.getCell(8).value = Number(transaction.amountInBase);
    row.getCell(8).numFmt = moneyFormat(baseCurrency);
    row.getCell(8).font = { bold: true, color };

    for (let column = 1; column <= LAST_COLUMN; column++) {
      const cell = row.getCell(column);
      cell.border = thinBottom(COLORS.line);
      if (index % 2 === 1) cell.fill = solid(COLORS.band);
    }
  });

  const lastDataRow = FIRST_DATA_ROW + transactions.length - 1;

  if (transactions.length > 0) {
    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: lastDataRow, column: LAST_COLUMN },
    };
  }

  // Totales al pie, con fórmulas sobre la columna "Monto en moneda base"
  const incomeRow = lastDataRow + 2;
  const expenseRow = incomeRow + 1;
  const balanceRow = expenseRow + 1;
  const baseRange = `$H$${FIRST_DATA_ROW}:$H$${lastDataRow}`;
  const typeRange = `$B$${FIRST_DATA_ROW}:$B$${lastDataRow}`;
  const hasRows = transactions.length > 0;

  const totalLines = [
    {
      row: incomeRow,
      label: 'Total ingresos',
      value: hasRows
        ? { formula: `SUMIF(${typeRange},"Ingreso",${baseRange})`, result: totals.income }
        : 0,
      color: COLORS.income,
    },
    {
      row: expenseRow,
      label: 'Total gastos',
      value: hasRows
        ? { formula: `SUMIF(${typeRange},"Gasto",${baseRange})`, result: totals.expense }
        : 0,
      color: COLORS.expense,
    },
    {
      row: balanceRow,
      label: 'Balance',
      value: { formula: `H${incomeRow}-H${expenseRow}`, result: totals.balance },
      color: totals.balance < 0 ? COLORS.expense : COLORS.income,
    },
  ];

  for (const line of totalLines) {
    const label = sheet.getCell(line.row, 7);
    label.value = line.label;
    label.font = { bold: true, color: { argb: COLORS.text } };
    label.alignment = { horizontal: 'right' };

    const value = sheet.getCell(line.row, 8);
    value.value = line.value;
    value.numFmt = moneyFormat(baseCurrency);
    value.font = { bold: true, size: 12, color: { argb: line.color } };

    for (const column of [7, 8]) sheet.getCell(line.row, column).fill = solid(COLORS.brandLight);
  }
  for (const column of [7, 8]) {
    sheet.getCell(incomeRow, column).border = {
      top: { style: 'medium', color: { argb: COLORS.brand } },
    };
  }

  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];

  return { incomeRow, expenseRow, hasRows };
}

function writeCategorySection(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  items: readonly CategoryTotal[],
  total: number,
  baseCurrency: Currency,
): number {
  sheet.mergeCells(startRow, 1, startRow, 4);
  const section = sheet.getCell(startRow, 1);
  section.value = title;
  section.font = { bold: true, size: 12, color: { argb: COLORS.brand } };
  section.fill = solid(COLORS.brandLight);

  const headerRow = startRow + 1;
  ['Categoría', 'Total', '% del total', 'Movimientos'].forEach((text, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = text;
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = solid(COLORS.brand);
    cell.alignment = { horizontal: index === 0 ? 'left' : 'right' };
  });

  let row = headerRow + 1;
  if (items.length === 0) {
    sheet.mergeCells(row, 1, row, 4);
    sheet.getCell(row, 1).value = 'Sin movimientos';
    sheet.getCell(row, 1).font = { italic: true, color: { argb: COLORS.muted } };
    return row + 2;
  }

  for (const item of items) {
    sheet.getCell(row, 1).value = item.name;
    sheet.getCell(row, 2).value = centsToNumber(item.cents);
    sheet.getCell(row, 2).numFmt = moneyFormat(baseCurrency);
    sheet.getCell(row, 3).value = item.share;
    sheet.getCell(row, 3).numFmt = '0.0%';
    sheet.getCell(row, 4).value = item.count;
    for (let column = 1; column <= 4; column++) {
      sheet.getCell(row, column).border = thinBottom(COLORS.line);
    }
    row += 1;
  }

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  sheet.getCell(row, 1).value = 'Total';
  sheet.getCell(row, 2).value = total;
  sheet.getCell(row, 2).numFmt = moneyFormat(baseCurrency);
  sheet.getCell(row, 3).value = 1;
  sheet.getCell(row, 3).numFmt = '0.0%';
  sheet.getCell(row, 4).value = totalCount;
  for (let column = 1; column <= 4; column++) {
    const cell = sheet.getCell(row, column);
    cell.font = { bold: true };
    cell.border = { top: { style: 'thin', color: { argb: COLORS.brand } } };
  }

  return row + 2;
}

function writeSummarySheet(
  sheet: ExcelJS.Worksheet,
  options: WorkbookOptions,
  detail: { incomeRow: number; expenseRow: number; hasRows: boolean },
  totals: { income: number; expense: number; balance: number },
  summary: ReturnType<typeof summarizeTransactions>,
) {
  const { baseCurrency, filtersDescription, generatedAt } = options;

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 14;

  writeTitle(
    sheet,
    'FinTrack · Resumen',
    `${filtersDescription} · Moneda base: ${baseCurrency} · Generado el ${generatedLabel(generatedAt)}`,
    4,
  );

  // Los totales apuntan a la hoja de movimientos: si se edita allá, se actualizan acá
  const reference = (row: number, fallback: number) =>
    detail.hasRows ? { formula: `'${SHEET_DETAIL}'!H${row}`, result: fallback } : fallback;

  const kpis = [
    {
      label: 'Ingresos',
      value: reference(detail.incomeRow, totals.income),
      color: COLORS.income,
      format: moneyFormat(baseCurrency),
    },
    {
      label: 'Gastos',
      value: reference(detail.expenseRow, totals.expense),
      color: COLORS.expense,
      format: moneyFormat(baseCurrency),
    },
    {
      label: 'Balance',
      value: { formula: 'B4-B5', result: totals.balance },
      color: totals.balance < 0 ? COLORS.expense : COLORS.income,
      format: moneyFormat(baseCurrency),
    },
    {
      label: 'Movimientos',
      value: summary.count,
      color: COLORS.text,
      format: '#,##0',
    },
  ];

  kpis.forEach((kpi, index) => {
    const row = 4 + index;
    const label = sheet.getCell(row, 1);
    label.value = kpi.label;
    label.font = { color: { argb: COLORS.muted } };
    const value = sheet.getCell(row, 2);
    value.value = kpi.value;
    value.numFmt = kpi.format;
    value.font = { bold: true, size: 13, color: { argb: kpi.color } };
    value.alignment = { horizontal: 'right' };
    for (const column of [1, 2]) {
      sheet.getCell(row, column).fill = solid(COLORS.brandLight);
      sheet.getCell(row, column).border = thinBottom(COLORS.white);
    }
    sheet.getRow(row).height = 22;
  });

  const afterExpenses = writeCategorySection(
    sheet,
    9,
    'Gastos por categoría',
    summary.expenseByCategory,
    totals.expense,
    baseCurrency,
  );
  writeCategorySection(
    sheet,
    afterExpenses,
    'Ingresos por categoría',
    summary.incomeByCategory,
    totals.income,
    baseCurrency,
  );
}

/** Arma el libro de Excel y lo devuelve como archivo .xlsx listo para enviar. */
export async function buildTransactionsWorkbook(options: WorkbookOptions): Promise<Buffer> {
  const summary = summarizeTransactions(options.transactions);
  const totals = {
    income: centsToNumber(summary.income),
    expense: centsToNumber(summary.expense),
    balance: centsToNumber(summary.balance),
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FinTrack';
  workbook.created = options.generatedAt;

  // "Resumen" va primero, así es lo que se ve al abrir el archivo
  const summarySheet = workbook.addWorksheet(SHEET_SUMMARY, {
    properties: { tabColor: { argb: COLORS.brand } },
    views: [{ showGridLines: false }],
  });
  const detailSheet = workbook.addWorksheet(SHEET_DETAIL, {
    properties: { tabColor: { argb: COLORS.income } },
  });

  const detail = writeDetailSheet(detailSheet, options, totals);
  writeSummarySheet(summarySheet, options, detail, totals, summary);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
