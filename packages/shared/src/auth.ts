import { z } from 'zod';
import { countrySchema } from './countries';
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

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(80, 'El nombre es demasiado largo');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  // La pantalla de registro lo exige; la API lo acepta vacío para no romper a quien ya la usa
  country: countrySchema.optional(),
});

/**
 * Formulario de registro de la web: pide el país y repetir la contraseña (esto último nunca
 * viaja a la API, solo se valida en el navegador).
 */
export const registerFormSchema = registerSchema
  .extend({
    country: countrySchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const loginSchema = z.object({
  email: emailSchema,
  // En el login no se aplican las reglas de formato: solo que venga algo.
  password: z.string().min(1, 'Ingresá tu contraseña').max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'El enlace no es válido').max(200, 'El enlace no es válido'),
  password: passwordSchema,
});

/** Formulario de la web para elegir la nueva contraseña (repetirla se valida solo en el navegador). */
export const resetPasswordFormSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Repetí la contraseña') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual').max(128),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña tiene que ser distinta de la actual',
  });

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual').max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña tiene que ser distinta de la actual',
  });

export const changeEmailSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().min(1, 'Ingresá tu contraseña').max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Ingresá tu contraseña').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** Usuario tal como lo expone la API (nunca incluye el hash de la contraseña). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  baseCurrency: Currency;
  /** País (código ISO de 2 letras); null en las cuentas que todavía no lo cargaron. */
  country: string | null;
  /** Color de acento elegido (#rrggbb); null si usa el de por defecto. */
  accentColor: string | null;
  createdAt: string;
}

/** Respuesta de register, login y refresh. El refresh token viaja en una cookie httpOnly. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
