import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt (node:crypto): función memory-hard recomendada por OWASP,
 * sin dependencias nativas que compilar. Parámetros: N=2^15, r=8, p=3 (≈32 MiB por hash).
 *
 * Formato almacenado: scrypt$N$r$p$salt(base64)$hash(base64)
 * Los parámetros viajan con el hash, así se pueden subir más adelante sin romper los existentes.
 */
const PREFIX = 'scrypt';
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      keyLength,
      { N: n, r, p, maxmem: 128 * n * r * 2 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return [PREFIX, N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const params = [Number(n), Number(r), Number(p)];
  if (params.some((value) => !Number.isInteger(value) || value <= 0)) return false;

  const expected = Buffer.from(hashB64, 'base64');
  const salt = Buffer.from(saltB64, 'base64');
  const [pn, pr, pp] = params as [number, number, number];

  try {
    const actual = await derive(password, salt, pn, pr, pp, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Hash ficticio contra el que se verifica cuando el email no existe, para que el login
 * tarde lo mismo exista o no la cuenta (evita revelarlo midiendo tiempos de respuesta).
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('contraseña-ficticia-para-igualar-tiempos');
  return dummyHash;
}
