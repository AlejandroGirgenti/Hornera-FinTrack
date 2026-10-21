import { describe, expect, it } from 'vitest';
import { getDummyHash, hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('genera un hash con formato scrypt y distinto en cada llamada (salt aleatorio)', async () => {
    const a = await hashPassword('Segura123');
    const b = await hashPassword('Segura123');

    expect(a.startsWith('scrypt$')).toBe(true);
    expect(a.split('$')).toHaveLength(6);
    expect(a).not.toContain('Segura123');
    expect(a).not.toBe(b);
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('Segura123');

    expect(await verifyPassword(hash, 'Segura123')).toBe(true);
    expect(await verifyPassword(hash, 'segura123')).toBe(false);
    expect(await verifyPassword(hash, '')).toBe(false);
  });

  it('normaliza Unicode: la misma contraseña con distinta composición coincide', async () => {
    const hash = await hashPassword('Contraseña1é'); // é precompuesta
    expect(await verifyPassword(hash, 'Contraseña1é')).toBe(true); // e + acento combinado
  });

  it('devuelve false (sin lanzar) ante hashes mal formados', async () => {
    expect(await verifyPassword('', 'x')).toBe(false);
    expect(await verifyPassword('no-es-un-hash', 'x')).toBe(false);
    expect(await verifyPassword('scrypt$a$b$c$d$e', 'x')).toBe(false);
    expect(await verifyPassword('bcrypt$1$2$3$4$5', 'x')).toBe(false);
  });

  it('reutiliza el mismo hash ficticio', async () => {
    expect(await getDummyHash()).toBe(await getDummyHash());
  });
});
