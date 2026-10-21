import type { User } from '@prisma/client';
import type { AuthUser, LoginInput, RegisterInput } from '@fintrack/shared';
import { conflict, unauthorized } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { DEFAULT_CATEGORIES } from './default-categories';
import { getDummyHash, hashPassword, verifyPassword } from './password';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens';

export interface Session {
  user: AuthUser;
  accessToken: string;
  /** Valor en claro del refresh token: solo se usa para armar la cookie. */
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    baseCurrency: user.baseCurrency,
    createdAt: user.createdAt.toISOString(),
  };
}

async function createSession(user: User): Promise<Session> {
  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt, userId: user.id },
  });
  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(user.id),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function register(input: RegisterInput): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese email');

  const passwordHash = await hashPassword(input.password);

  // Usuario y categorías por defecto se crean juntos o no se crea nada
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId: created.id })),
    });
    return created;
  });

  return createSession(user);
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Se verifica siempre una contraseña (real o ficticia) para no filtrar por tiempo qué emails existen
  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);
  if (!user || !valid) {
    throw unauthorized('INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }

  return createSession(user);
}

/**
 * Rotación del refresh token: el que se presenta se revoca y se emite uno nuevo.
 * Si llega uno que ya estaba revocado, alguien lo está reutilizando (posible robo):
 * se revocan todas las sesiones del usuario.
 */
export async function refresh(rawToken: string | undefined): Promise<Session> {
  if (!rawToken) throw unauthorized('NO_REFRESH_TOKEN', 'No hay una sesión iniciada');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!stored) throw unauthorized('INVALID_REFRESH_TOKEN', 'La sesión no es válida');

  const revokeAllSessions = async () => {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn(
      { userId: stored.userId },
      'Refresh token reutilizado: se revocaron todas las sesiones',
    );
    return unauthorized(
      'REFRESH_TOKEN_REUSED',
      'La sesión fue invalidada. Iniciá sesión de nuevo.',
    );
  };

  if (stored.revokedAt) throw await revokeAllSessions();
  if (stored.expiresAt <= new Date())
    throw unauthorized('REFRESH_TOKEN_EXPIRED', 'La sesión venció');

  // Se "reclama" el token de forma atómica: si dos peticiones lo usan a la vez, solo una gana
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) throw await revokeAllSessions();

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw unauthorized('INVALID_REFRESH_TOKEN', 'La sesión no es válida');

  return createSession(user);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized('INVALID_ACCESS_TOKEN', 'La cuenta ya no existe');
  return toAuthUser(user);
}
