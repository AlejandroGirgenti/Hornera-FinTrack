import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashToken, signAccessToken, verifyAccessToken } from './tokens';

const SECRET = 'secreto-solo-para-tests-0123456789-abcdef'; // el mismo de vitest.config.ts

describe('access token', () => {
  it('firma y verifica devolviendo el id del usuario', () => {
    const token = signAccessToken('user_123');
    expect(verifyAccessToken(token)).toBe('user_123');
  });

  it('rechaza un token vencido', () => {
    const expired = jwt.sign({ sub: 'user_123', exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    expect(() => verifyAccessToken(expired)).toThrowError(/inválido o venció/);
  });

  it('rechaza un token firmado con otro secreto', () => {
    const foreign = jwt.sign({}, 'otro-secreto-distinto-0123456789-abcdef', {
      subject: 'user_123',
    });
    expect(() => verifyAccessToken(foreign)).toThrowError();
  });

  it('rechaza un token cuyo contenido fue alterado', () => {
    const [header, , signature] = signAccessToken('user_123').split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'otro_usuario', exp: Math.floor(Date.now() / 1000) + 600 }),
    ).toString('base64url');
    expect(() => verifyAccessToken(`${header}.${forgedPayload}.${signature}`)).toThrowError();
  });

  it('rechaza tokens sin firma (algoritmo none)', () => {
    const unsigned = jwt.sign({}, '', { algorithm: 'none', subject: 'user_123' });
    expect(() => verifyAccessToken(unsigned)).toThrowError();
  });

  it('rechaza texto que no es un JWT', () => {
    expect(() => verifyAccessToken('basura')).toThrowError();
  });
});

describe('refresh token', () => {
  it('genera tokens únicos y largos', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43); // 32 bytes en base64url
  });

  it('guarda solo el hash, nunca el token en claro', () => {
    const { token, tokenHash } = generateRefreshToken();
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('vence en el futuro según REFRESH_TOKEN_TTL_DAYS', () => {
    const { expiresAt } = generateRefreshToken();
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
  });
});
