import { z } from 'zod';

/** Tipos de dólar que se pueden consultar (los nombres de "casa" de dolarapi.com). */
export const USD_RATE_TYPES = [
  'oficial',
  'blue',
  'bolsa',
  'contadoconliqui',
  'mayorista',
  'tarjeta',
] as const;

export const usdRateTypeSchema = z.enum(USD_RATE_TYPES);

export const usdRateQuerySchema = z.object({
  type: usdRateTypeSchema.default('oficial'),
});

export type UsdRateType = z.infer<typeof usdRateTypeSchema>;
export type UsdRateQuery = z.infer<typeof usdRateQuerySchema>;

/** Cotización del dólar en pesos. Los valores viajan como string con 2 decimales. */
export interface UsdRateDto {
  type: UsdRateType;
  /** Precio de compra (ARS por 1 USD). */
  buy: string;
  /** Precio de venta (ARS por 1 USD). Es el que se usa para pagos en dólares. */
  sell: string;
  /** Cuándo actualizó el dato la fuente (ISO 8601). */
  updatedAt: string;
  source: string;
}
