import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  api,
  apiDownload,
  filenameFromDisposition,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from './api';

const session = { accessToken: 'token-nuevo', user: { id: 'u1', email: 'a@b.c', name: 'Ale' } };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const apiError = (code: string, message: string, status: number) =>
  json({ error: { code, message } }, status);

const fetchMock = vi.fn<typeof fetch>();

function authHeader(callIndex: number): string | undefined {
  const init = fetchMock.mock.calls[callIndex]?.[1];
  return (init?.headers as Record<string, string> | undefined)?.['Authorization'];
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  setSessionExpiredHandler(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('envía el access token y devuelve el JSON', async () => {
    setAccessToken('abc');
    fetchMock.mockResolvedValueOnce(json({ data: 1 }));

    await expect(api('/reports/summary')).resolves.toEqual({ data: 1 });
    expect(authHeader(0)).toBe('Bearer abc');
  });

  it('no envía el token cuando auth es false', async () => {
    setAccessToken('abc');
    fetchMock.mockResolvedValueOnce(json({ data: 1 }));

    await api('/auth/login', { method: 'POST', body: { a: 1 }, auth: false });
    expect(authHeader(0)).toBeUndefined();
  });

  it('convierte las respuestas de error de la API en ApiError', async () => {
    fetchMock.mockResolvedValueOnce(apiError('VALIDATION_ERROR', 'Datos inválidos', 400));

    const error = await api('/transactions').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
    });
  });

  it('usa un error genérico si la respuesta no es JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));

    await expect(api('/transactions')).rejects.toMatchObject({
      status: 502,
      code: 'UNEXPECTED_ERROR',
    });
  });

  it('informa un error de red como ApiError con status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api('/transactions')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('en un 401 renueva la sesión y reintenta con el token nuevo', async () => {
    setAccessToken('vencido');
    fetchMock
      .mockResolvedValueOnce(apiError('UNAUTHORIZED', 'Token vencido', 401))
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ data: 'ok' }));

    await expect(api('/reports/summary')).resolves.toEqual({ data: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/auth/refresh');
    expect(authHeader(2)).toBe('Bearer token-nuevo');
  });

  it('si no se puede renovar la sesión avisa y falla con el 401 original', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    fetchMock
      .mockResolvedValueOnce(apiError('UNAUTHORIZED', 'Token vencido', 401))
      .mockResolvedValueOnce(apiError('UNAUTHORIZED', 'Sesión inválida', 401));

    await expect(api('/reports/summary')).rejects.toMatchObject({ status: 401 });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // no reintenta la petición original
  });

  it('un 401 con auth=false (credenciales inválidas) no intenta renovar la sesión', async () => {
    fetchMock.mockResolvedValueOnce(apiError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401));

    await expect(
      api('/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('refreshSession', () => {
  it('comparte una sola llamada entre pedidos simultáneos', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(session)));

    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('permite una llamada nueva cuando la anterior terminó', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(session)));

    await refreshSession();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('guarda el token recibido para las siguientes peticiones', async () => {
    fetchMock.mockResolvedValueOnce(json(session)).mockResolvedValueOnce(json({ data: 1 }));

    await refreshSession();
    await api('/reports/summary');

    expect(authHeader(1)).toBe('Bearer token-nuevo');
  });
});

describe('filenameFromDisposition', () => {
  it('extrae el nombre del archivo del encabezado', () => {
    expect(filenameFromDisposition('attachment; filename="movimientos-2026-10-23.csv"')).toBe(
      'movimientos-2026-10-23.csv',
    );
    expect(filenameFromDisposition('attachment; filename=datos.csv')).toBe('datos.csv');
  });

  it('devuelve null si no hay encabezado o no trae nombre', () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition('inline')).toBeNull();
  });
});

describe('apiDownload', () => {
  it('devuelve el archivo y su nombre', async () => {
    setAccessToken('abc');
    fetchMock.mockResolvedValueOnce(
      new Response('a;b', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="x.csv"' },
      }),
    );

    const { blob, filename } = await apiDownload('/transactions/export');

    expect(filename).toBe('x.csv');
    expect(await blob.text()).toBe('a;b');
    expect(authHeader(0)).toBe('Bearer abc');
  });

  it('renueva la sesión si el token venció y reintenta la descarga', async () => {
    setAccessToken('vencido');
    fetchMock
      .mockResolvedValueOnce(apiError('UNAUTHORIZED', 'Token vencido', 401))
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const { blob } = await apiDownload('/transactions/export');

    expect(await blob.text()).toBe('ok');
    expect(authHeader(2)).toBe('Bearer token-nuevo');
  });

  it('lanza un ApiError cuando la API responde con error', async () => {
    fetchMock.mockResolvedValueOnce(apiError('VALIDATION_ERROR', 'Filtros inválidos', 400));

    await expect(apiDownload('/transactions/export')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
