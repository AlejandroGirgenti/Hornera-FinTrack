import { z } from 'zod';
import type { Currency } from './enums';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'El email es demasiado largo')
  .email('Ingresá un email válido');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/\d/, 'La contraseña debe incluir al menos un número');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre es demasiado largo'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // En el login no se aplican las reglas de formato: solo que venga algo.
  password: z.string().min(1, 'Ingresá tu contraseña').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Usuario tal como lo expone la API (nunca incluye el hash de la contraseña). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  baseCurrency: Currency;
  createdAt: string;
}

/** Respuesta de register, login y refresh. El refresh token viaja en una cookie httpOnly. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
