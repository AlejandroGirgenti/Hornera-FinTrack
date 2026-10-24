import type { Currency, UsdRateType } from '@fintrack/shared';

/** Cómo se llama cada tipo de dólar en la pantalla. */
export const USD_RATE_LABELS: Record<UsdRateType, string> = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP (Bolsa)',
  contadoconliqui: 'CCL (Contado con liquidación)',
  mayorista: 'Mayorista',
  tarjeta: 'Tarjeta',
};

/** De dónde sale la cotización del formulario: a mano o de un tipo de dólar consultado. */
export type RateSource = UsdRateType | 'manual';

/**
 * La cotización automática solo existe para dólares contra pesos. Si la moneda base de la
 * persona fuera otra, la cotización tiene que ingresarla ella.
 */
export function canAutoRate(baseCurrency: Currency, currency: Currency): boolean {
  return baseCurrency === 'ARS' && currency === 'USD';
}
