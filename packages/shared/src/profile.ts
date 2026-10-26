import { z } from 'zod';
import { HEX_COLOR_PATTERN, isReadableAccent } from './accent';
import { nameSchema } from './auth';
import { countrySchema } from './countries';
import { currencySchema } from './enums';

export const accentColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, 'El color debe tener formato hexadecimal, por ejemplo #4a2b8a')
  .toLowerCase()
  .refine(isReadableAccent, 'Elegí un color más oscuro para que el texto blanco se lea bien');

/**
 * Datos del perfil que la persona puede cambiar. Se manda solo lo que cambia (al menos un campo);
 * `accentColor: null` vuelve al color por defecto. Es estricto: rechaza campos desconocidos.
 * El correo y la contraseña tienen sus propios pedidos porque exigen la contraseña actual.
 */
export const updateProfileSchema = z
  .strictObject({
    name: nameSchema.optional(),
    country: countrySchema.optional(),
    baseCurrency: currencySchema.optional(),
    accentColor: accentColorSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'No hay nada para actualizar',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
