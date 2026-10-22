import { z } from 'zod';
import { transactionTypeSchema } from './enums';
import type { TransactionType } from './enums';

const nameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(40, 'El nombre no puede superar los 40 caracteres');

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe tener formato hexadecimal, por ejemplo #22c55e')
  .toLowerCase();

const iconSchema = z.string().trim().min(1).max(40);

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

export const createCategorySchema = z.object({
  name: nameSchema,
  type: transactionTypeSchema,
  color: colorSchema.default(DEFAULT_CATEGORY_COLOR),
  icon: iconSchema.nullable().optional(),
});

/**
 * El tipo (ingreso/gasto) no se puede cambiar una vez creada la categoría: sus movimientos
 * quedarían inconsistentes. Por eso el esquema es estricto y rechaza campos desconocidos.
 */
export const updateCategorySchema = z
  .strictObject({
    name: nameSchema.optional(),
    color: colorSchema.optional(),
    icon: iconSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Enviá al menos un campo para modificar');

export const listCategoriesQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Categoría tal como la expone la API. */
export interface CategoryDto {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string | null;
  createdAt: string;
}
