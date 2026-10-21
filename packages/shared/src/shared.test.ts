import { describe, expect, it } from 'vitest';
import {
  buildPaginationMeta,
  loginSchema,
  paginationQuerySchema,
  passwordSchema,
  registerSchema,
} from './index';

describe('registerSchema', () => {
  const valid = { name: 'Ana Pérez', email: 'Ana@Example.com ', password: 'Segura123' };

  it('normaliza el email (trim + minúsculas)', () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe('ana@example.com');
  });

  it('rechaza emails inválidos', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'no-es-un-email' }).success).toBe(false);
  });

  it('rechaza nombres demasiado cortos', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('exige longitud mínima, una letra y un número', () => {
    expect(passwordSchema.safeParse('corta1').success).toBe(false);
    expect(passwordSchema.safeParse('sinnumeroslargos').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('Segura123').success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('no aplica reglas de formato a la contraseña, solo que exista', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('paginación', () => {
  it('aplica valores por defecto y convierte strings', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('limita el tamaño de página', () => {
    expect(paginationQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('calcula el total de páginas', () => {
    expect(buildPaginationMeta(1, 20, 0).totalPages).toBe(1);
    expect(buildPaginationMeta(1, 20, 87).totalPages).toBe(5);
  });
});
