import type { Prisma, User } from '@prisma/client';
import type {
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@fintrack/shared';
import { env } from '../../config/env';
import { badRequest, conflict, unauthorized } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { sendMail } from '../../lib/mailer';
import { prisma } from '../../lib/prisma';
import { DEFAULT_CATEGORIES } from './default-categories';
import { getDummyHash, hashPassword, verifyPassword } from './password';
import { RESET_TOKEN_TTL_MINUTES, buildResetPasswordMail } from './password-reset.mail';
import { generateOneTimeToken, generateRefreshToken, hashToken, signAccessToken } from './tokens';

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
    country: user.country,
    accentColor: user.accentColor,
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
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        ...(input.country ? { country: input.country } : {}),
      },
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

async function requireUser(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized('INVALID_ACCESS_TOKEN', 'La cuenta ya no existe');
  return user;
}

/** Error 400 con el mensaje junto al campo de la contraseña, como el resto de las validaciones. */
function wrongPassword(field: string) {
  return badRequest('VALIDATION_ERROR', 'Los datos enviados no son válidos', [
    { field, message: 'La contraseña no es correcta' },
  ]);
}

/** Pide la contraseña actual: para cambios delicados (correo, contraseña, borrar la cuenta). */
async function requireCurrentPassword(user: User, password: string, field: string) {
  if (!(await verifyPassword(user.passwordHash, password))) throw wrongPassword(field);
}

/**
 * Actualiza los datos del perfil que la persona puede cambiar (nombre, país, moneda base y color).
 * La moneda base solo se puede cambiar mientras no haya movimientos: cada movimiento guarda su
 * monto ya convertido a esa moneda, y cambiarla dejaría los totales mezclados.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
  const user = await requireUser(userId);
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.country !== undefined) data.country = input.country;
  if (input.accentColor !== undefined) data.accentColor = input.accentColor;

  if (input.baseCurrency !== undefined && input.baseCurrency !== user.baseCurrency) {
    const movements = await prisma.transaction.count({ where: { userId, deletedAt: null } });
    if (movements > 0) {
      throw conflict(
        'BASE_CURRENCY_LOCKED',
        'No se puede cambiar la moneda base mientras tengas movimientos cargados',
      );
    }
    data.baseCurrency = input.baseCurrency;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data }).catch(() => null);
  if (!updated) throw unauthorized('INVALID_ACCESS_TOKEN', 'La cuenta ya no existe');
  return toAuthUser(updated);
}

/** Cambia el correo. Pide la contraseña actual para que nadie con una sesión abierta lo robe. */
export async function changeEmail(userId: string, input: ChangeEmailInput): Promise<AuthUser> {
  const user = await requireUser(userId);
  await requireCurrentPassword(user, input.currentPassword, 'currentPassword');
  if (input.email === user.email) return toAuthUser(user);

  const taken = () => conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese email');
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw taken();

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: input.email },
    });
    return toAuthUser(updated);
  } catch (error) {
    // Otra cuenta tomó el email justo entre la consulta y el cambio
    if ((error as { code?: string }).code === 'P2002') throw taken();
    throw error;
  }
}

/**
 * Cambia la contraseña y cierra las demás sesiones (por si alguien más tenía la cuenta abierta).
 * La sesión desde la que se hace el cambio sigue activa: `keepTokenHash` es la de su cookie.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  keepTokenHash: string | null,
): Promise<void> {
  const user = await requireUser(userId);
  await requireCurrentPassword(user, input.currentPassword, 'currentPassword');
  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Se BORRAN (no se marcan como revocados): un token revocado que alguien vuelve a presentar
    // se toma como robo y cierra todas las sesiones, y la actual tiene que seguir abierta
    prisma.refreshToken.deleteMany({
      where: {
        userId,
        ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}),
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
}

/**
 * Borra la cuenta con todos sus datos (categorías, movimientos, presupuestos, sesiones…). Es
 * definitivo. Se borra en orden dentro de una transacción para que no quede nada a medias.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await requireUser(userId);
  await requireCurrentPassword(user, password, 'password');

  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.recurringRule.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }), // sesiones y enlaces de recuperación, en cascada
  ]);
  logger.info({ userId }, 'Cuenta eliminada por su titular');
}

/**
 * "Olvidé mi contraseña": si el email tiene cuenta, se genera un enlace de un solo uso y se envía
 * por correo. Responde igual exista o no la cuenta, para no revelar qué emails están registrados;
 * el correo se manda sin esperar, así tampoco se nota por el tiempo de respuesta.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const { token, tokenHash } = generateOneTimeToken();
  await prisma.$transaction([
    // Un solo enlace vigente por cuenta: el anterior deja de servir
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  const link = `${env.appUrl}/restablecer-contrasena?token=${token}`;
  void sendMail(buildResetPasswordMail({ to: user.email, name: user.name, link })).catch(
    (error: unknown) =>
      logger.error({ err: error, userId: user.id }, 'No se pudo enviar el correo de recuperación'),
  );
}

/** Elige una contraseña nueva con el enlace del correo. Cierra todas las sesiones abiertas. */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const invalid = () =>
    badRequest('INVALID_RESET_TOKEN', 'El enlace no es válido o venció. Pedí uno nuevo.');

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt <= new Date()) throw invalid();

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    // Se "reclama" el enlace de forma atómica: si se usa dos veces a la vez, solo una gana
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw invalid();

    await tx.user.update({ where: { id: stored.userId }, data: { passwordHash } });
    // Todas las sesiones se cierran; se borran para que no disparen la detección de reutilización
    await tx.refreshToken.deleteMany({ where: { userId: stored.userId } });
    await tx.passwordResetToken.deleteMany({
      where: { userId: stored.userId, id: { not: stored.id } },
    });
  });
}
