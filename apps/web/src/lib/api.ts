import type { ApiErrorBody, AuthResponse } from '@fintrack/shared';

/**
 * En desarrollo la URL es relativa (Vite reenvía /api a la API). En producción, si el frontend y
 * la API están en dominios distintos, se define VITE_API_URL; lo más simple es seguir usando una
 * ruta relativa y que el hosting del frontend reenvíe /api (así la cookie es del mismo sitio).
 */
const BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined) ?? ''}/api/v1`;

/** Error devuelto por la API, con el formato uniforme { error: { code, message, details } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// El access token vive solo en memoria: no se guarda en localStorage, así un XSS no puede robarlo
// para usarlo después. Al recargar la página se recupera con el refresh token (cookie httpOnly).
let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** El contexto de autenticación se registra acá para enterarse cuando la sesión ya no se puede renovar. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Si es false no se envía el token ni se intenta renovar la sesión (login, registro…). */
  auth?: boolean;
}

function send(path: string, { method = 'GET', body, auth = true }: RequestOptions) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
    credentials: 'include', // envía la cookie del refresh token
  }).catch(() => {
    // fetch solo rechaza cuando no hay conexión (o el servidor está caído): no hay respuesta HTTP
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Revisá tu conexión.',
    );
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = (await response.json()) as Partial<ApiErrorBody>;
    if (error?.code && error.message) {
      return new ApiError(response.status, error.code, error.message, error.details);
    }
  } catch {
    // la respuesta no era JSON: se usa el error genérico de abajo
  }
  return new ApiError(response.status, 'UNEXPECTED_ERROR', 'Ocurrió un error inesperado');
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Renueva la sesión con el refresh token. Si varias peticiones lo piden a la vez (o React ejecuta
 * el efecto dos veces en desarrollo), todas comparten UNA sola llamada: el backend rota el refresh
 * token en cada uso y consideraría "reutilización" (posible robo) una segunda llamada con el
 * token viejo, cerrando todas las sesiones.
 */
export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= (async () => {
    const session = await parse<AuthResponse>(
      await send('/auth/refresh', { method: 'POST', auth: false }),
    );
    accessToken = session.accessToken;
    return session;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Hace la petición y, si responde 401 con un token que venció, renueva la sesión una vez y
 * reintenta; si no se puede renovar, avisa al contexto de autenticación para que lleve al
 * usuario al login.
 */
async function request(path: string, options: RequestOptions): Promise<Response> {
  const response = await send(path, options);

  if (response.status === 401 && options.auth !== false) {
    try {
      await refreshSession();
    } catch {
      onSessionExpired();
      throw await toApiError(response);
    }
    return send(path, options);
  }

  return response;
}

/** Llama a la API y devuelve el JSON de la respuesta (o lanza un ApiError). */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return parse<T>(await request(path, options));
}

/** "attachment; filename="movimientos-2026-10-23.csv"" → "movimientos-2026-10-23.csv". */
export function filenameFromDisposition(header: string | null): string | null {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

/** Descarga un archivo desde la API (por ejemplo el CSV), con la sesión de la persona. */
export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const response = await request(path, {});
  if (!response.ok) throw await toApiError(response);
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  };
}
