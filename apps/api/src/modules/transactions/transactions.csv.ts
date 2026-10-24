import type { TransactionDto } from '@fintrack/shared';

/**
 * Exportación a CSV pensada para abrirse con doble clic en Excel en español:
 * - separador ";" (con "," Excel en Argentina junta todo en una sola columna),
 * - decimales con coma (con punto, Excel lo toma como texto o como fecha),
 * - BOM UTF-8 al principio para que las tildes y la ñ se vean bien,
 * - saltos de línea CRLF.
 */
const SEPARATOR = ';';
const BOM = '\uFEFF';

const HEADERS = [
  'Fecha',
  'Tipo',
  'Categoría',
  'Nota',
  'Monto',
  'Moneda',
  'Cotización',
  'Monto en moneda base',
] as const;

/**
 * Escapa una celda de texto. Además de las comillas del formato, neutraliza la "inyección de
 * fórmulas": si una nota empieza con = + - @ (o tab / retorno), Excel la ejecutaría como fórmula
 * al abrir el archivo. Un apóstrofe al principio la deja como texto.
 */
export function escapeCsvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** "1500.50" → "1500,50". Los montos de la API ya vienen como string exacto. */
const toSpanishDecimal = (amount: string) => amount.replace('.', ',');

export function buildTransactionsCsv(transactions: readonly TransactionDto[]): string {
  const rows = transactions.map((transaction) =>
    [
      transaction.date,
      transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto',
      escapeCsvText(transaction.category.name),
      escapeCsvText(transaction.note ?? ''),
      toSpanishDecimal(transaction.amount),
      transaction.currency,
      transaction.exchangeRate ? toSpanishDecimal(transaction.exchangeRate) : '',
      toSpanishDecimal(transaction.amountInBase),
    ].join(SEPARATOR),
  );

  return BOM + [HEADERS.join(SEPARATOR), ...rows].join('\r\n') + '\r\n';
}
