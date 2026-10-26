import { describe, expect, it } from 'vitest';
import {
  changePasswordFormSchema,
  registerFormSchema,
  resetPasswordFormSchema,
  updateProfileSchema,
} from './index';

const base = { name: 'Ana Pérez', email: 'ana@example.com', password: 'Segura123' };

describe('registerFormSchema', () => {
  it('acepta país y contraseñas iguales', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      country: 'AR',
      confirmPassword: 'Segura123',
    });
    expect(result.success).toBe(true);
  });

  it('exige el país', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      country: '',
      confirmPassword: 'Segura123',
    });
    expect(result.success).toBe(false);
  });

  it('marca el campo de repetir cuando las contraseñas no coinciden', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      country: 'AR',
      confirmPassword: 'Otra12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
      expect(result.error.issues[0]?.message).toBe('Las contraseñas no coinciden');
    }
  });
});

describe('resetPasswordFormSchema', () => {
  it('aplica las reglas de contraseña y la confirmación', () => {
    expect(
      resetPasswordFormSchema.safeParse({ password: 'Nueva1234', confirmPassword: 'Nueva1234' })
        .success,
    ).toBe(true);
    expect(
      resetPasswordFormSchema.safeParse({ password: 'corta', confirmPassword: 'corta' }).success,
    ).toBe(false);
    expect(
      resetPasswordFormSchema.safeParse({ password: 'Nueva1234', confirmPassword: 'Nueva12345' })
        .success,
    ).toBe(false);
  });
});

describe('changePasswordFormSchema', () => {
  const valid = {
    currentPassword: 'Vieja1234',
    newPassword: 'Nueva1234',
    confirmPassword: 'Nueva1234',
  };

  it('acepta una nueva contraseña distinta, confirmada y con formato válido', () => {
    expect(changePasswordFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza repetir la contraseña actual como nueva', () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: 'Vieja1234',
      newPassword: 'Vieja1234',
      confirmPassword: 'Vieja1234',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza si la confirmación no coincide', () => {
    expect(
      changePasswordFormSchema.safeParse({ ...valid, confirmPassword: 'Distinta1' }).success,
    ).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('acepta cualquier combinación de campos, con al menos uno', () => {
    expect(updateProfileSchema.safeParse({ name: 'Ana María' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ country: 'UY', baseCurrency: 'USD' }).success).toBe(
      true,
    );
    expect(updateProfileSchema.safeParse({ accentColor: null }).success).toBe(true);
  });

  it('rechaza un pedido vacío, campos desconocidos y valores inválidos', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
    expect(updateProfileSchema.safeParse({ email: 'x@y.com' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ country: 'Argentina' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ baseCurrency: 'EUR' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: 'A' }).success).toBe(false);
  });
});
