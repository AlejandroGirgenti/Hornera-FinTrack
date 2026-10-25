import { z } from 'zod';
import { HEX_COLOR_PATTERN, isReadableAccent } from './accent';

export const accentColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, 'El color debe tener formato hexadecimal, por ejemplo #4a2b8a')
  .toLowerCase()
  .refine(isReadableAccent, 'Elegí un color más oscuro para que el texto blanco se lea bien');

/**
 * Datos del perfil que la persona puede cambiar. Por ahora solo el color de acento:
 * `null` vuelve al color por defecto. Es estricto: rechaza campos desconocidos.
 */
export const updateProfileSchema = z.strictObject({
  accentColor: accentColorSchema.nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
