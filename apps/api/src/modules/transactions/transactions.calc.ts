import { Prisma } from '@prisma/client';
import type { Currency } from '@fintrack/shared';
import { badRequest } from '../../lib/errors';

/** Máximo que entra en la columna Decimal(14,2). */
const MAX_AMOUNT = new Prisma.Decimal('999999999999.99');

export interface ConversionInput {
  /** Monto en la moneda del movimiento, como string (nunca number). */
  amount: string;
  currency: Currency;
  /** Moneda base del usuario, en la que se calculan todos los reportes. */
  baseCurrency: Currency;
  /** Unidades de moneda base por 1 unidad de `currency`. */
  exchangeRate?: string | null;
}

export interface Conversion {
  /** null cuando el movimiento ya está en la moneda base. */
  exchangeRate: string | null;
  amountInBase: string;
}

/**
 * Calcula el monto en moneda base con aritmética decimal exacta (sin flotantes).
 *
 * - Si el movimiento está en la moneda base, no hay conversión y se descarta la cotización.
 * - Si no, la cotización es obligatoria y el resultado se redondea a 2 decimales (mitad hacia arriba).
 * - Se guarda la cotización usada: así los saldos históricos no cambian cuando el dólar se mueve.
 */
export function convertToBase(input: ConversionInput): Conversion {
  const amount = new Prisma.Decimal(input.amount);

  if (input.currency === input.baseCurrency) {
    return { exchangeRate: null, amountInBase: amount.toFixed(2) };
  }

  if (!input.exchangeRate) {
    throw badRequest(
      'EXCHANGE_RATE_REQUIRED',
      `Falta la cotización para convertir de ${input.currency} a ${input.baseCurrency}`,
    );
  }

  const rate = new Prisma.Decimal(input.exchangeRate);
  if (rate.lte(0)) {
    throw badRequest('INVALID_EXCHANGE_RATE', 'La cotización debe ser mayor a 0');
  }

  const amountInBase = amount.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (amountInBase.gt(MAX_AMOUNT)) {
    throw badRequest('AMOUNT_TOO_LARGE', 'El monto convertido es demasiado grande');
  }

  return { exchangeRate: rate.toFixed(4), amountInBase: amountInBase.toFixed(2) };
}
