import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRateCache, getUsdRate } from './exchange-rates.service';

const providerBody = {
  compra: 1545,
  venta: 1565.5,
  fechaActualizacion: '2026-10-22T18:00:00.000Z',
};

const okResponse = (body: unknown = providerBody) =>
  new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  clearRateCache();
});

describe('getUsdRate', () => {
  it('convierte la respuesta de la fuente al formato de la API', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(okResponse());

    const rate = await getUsdRate('blue', { fetchFn });

    expect(rate).toEqual({
      type: 'blue',
      buy: '1545.00',
      sell: '1565.50',
      updatedAt: '2026-10-22T18:00:00.000Z',
      source: 'dolarapi.com',
    });
    expect(String(fetchFn.mock.calls[0]?.[0])).toBe('https://dolarapi.com/v1/dolares/blue');
  });

  it('reutiliza el valor guardado durante 10 minutos', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(okResponse()));
    let now = 1_000_000;

    await getUsdRate('oficial', { fetchFn, now: () => now });
    now += 9 * 60 * 1000;
    await getUsdRate('oficial', { fetchFn, now: () => now });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    now += 2 * 60 * 1000; // ya pasaron 11 minutos
    await getUsdRate('oficial', { fetchFn, now: () => now });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('guarda cada tipo de dólar por separado', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(okResponse()));

    await getUsdRate('oficial', { fetchFn });
    await getUsdRate('blue', { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('si la fuente falla y hay un valor guardado vencido, devuelve ese', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(okResponse())
      .mockRejectedValueOnce(new Error('sin red'));
    let now = 1_000_000;

    const first = await getUsdRate('oficial', { fetchFn, now: () => now });
    now += 60 * 60 * 1000;
    const second = await getUsdRate('oficial', { fetchFn, now: () => now });

    expect(second).toEqual(first);
  });

  it('si la fuente falla y no hay nada guardado, responde 502 con un mensaje claro', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('sin red'));

    await expect(getUsdRate('oficial', { fetchFn })).rejects.toMatchObject({
      status: 502,
      code: 'RATE_PROVIDER_UNAVAILABLE',
    });
  });

  it('trata una respuesta HTTP de error como falla', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('error', { status: 500 }));

    await expect(getUsdRate('oficial', { fetchFn })).rejects.toMatchObject({ status: 502 });
  });

  it('rechaza datos con forma inesperada en vez de guardarlos', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(okResponse({ compra: 'mucho', venta: null }));

    await expect(getUsdRate('oficial', { fetchFn })).rejects.toMatchObject({ status: 502 });
  });
});
