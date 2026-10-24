/**
 * Tests de integración de la exportación a CSV y de la cotización del dólar
 * (Supertest + PostgreSQL real). La fuente externa de cotizaciones se simula: los tests nunca
 * salen a internet. Se omiten con un aviso si la base de test no responde.
 */
import ExcelJS from 'exceljs';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { clearRateCache } from '../src/modules/exchange-rates/exchange-rates.service';

async function databaseIsUp() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const dbUp = await databaseIsUp();
if (!dbUp) {
  console.warn('[integration] Sin conexión a PostgreSQL: se omiten los tests de CSV y cotización.');
}

const app = createApp();

const API = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function signUp(email: string) {
  const registered = await request(app)
    .post(`${API}/auth/register`)
    .send({ name: 'Usuario Test', email, password: 'Segura123' });
  const token = registered.body.accessToken as string;

  const list = await request(app).get(`${API}/categories`).set(bearer(token));
  const categories: Record<string, string> = Object.fromEntries(
    (list.body.data as { id: string; name: string }[]).map((c) => [c.name, c.id]),
  );
  return { token, categories };
}

type Session = Awaited<ReturnType<typeof signUp>>;

async function addTx(
  session: Session,
  tx: {
    type?: 'INCOME' | 'EXPENSE';
    amount: number;
    date: string;
    category: string;
    note?: string;
  },
) {
  const { category, ...rest } = tx;
  const res = await request(app)
    .post(`${API}/transactions`)
    .set(bearer(session.token))
    .send({ type: 'EXPENSE', ...rest, categoryId: session.categories[category] });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
}

describe.skipIf(!dbUp)('exportación a CSV y cotización del dólar', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    clearRateCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /transactions/export', () => {
    it('exige sesión', async () => {
      const res = await request(app).get(`${API}/transactions/export`);
      expect(res.status).toBe(401);
    });

    it('descarga un CSV con encabezados, BOM y una fila por movimiento', async () => {
      const ana = await signUp('ana@example.com');
      await addTx(ana, {
        amount: 1500.5,
        date: '2026-10-05',
        category: 'Comida',
        note: 'Pan; leche',
      });
      await addTx(ana, { type: 'INCOME', amount: 100000, date: '2026-10-01', category: 'Sueldo' });

      const res = await request(app).get(`${API}/transactions/export`).set(bearer(ana.token));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="movimientos-\d{4}-\d{2}-\d{2}\.csv"$/,
      );

      const lines = res.text.split('\r\n');
      expect(lines[0]).toBe(
        '﻿Fecha;Tipo;Categoría;Nota;Monto;Moneda;Cotización;Monto en moneda base',
      );
      // Orden por fecha descendente, decimales con coma y la nota con ";" entre comillas
      expect(lines[1]).toBe('2026-10-05;Gasto;Comida;"Pan; leche";1500,50;ARS;;1500,50');
      expect(lines[2]).toBe('2026-10-01;Ingreso;Sueldo;;100000,00;ARS;;100000,00');
    });

    it('aplica los mismos filtros que el listado y no pagina', async () => {
      const ana = await signUp('ana@example.com');
      for (let day = 1; day <= 25; day++) {
        await addTx(ana, {
          amount: 100,
          date: `2026-10-${String(day).padStart(2, '0')}`,
          category: 'Comida',
        });
      }
      await addTx(ana, { type: 'INCOME', amount: 5000, date: '2026-10-02', category: 'Sueldo' });

      const all = await request(app)
        .get(`${API}/transactions/export?type=EXPENSE`)
        .set(bearer(ana.token));
      // 1 encabezado + 25 gastos (más que el tamaño de página por defecto) + línea final vacía
      expect(all.text.split('\r\n')).toHaveLength(27);
      expect(all.text).not.toContain('Ingreso');

      const filtered = await request(app)
        .get(`${API}/transactions/export?from=2026-10-10&to=2026-10-12`)
        .set(bearer(ana.token));
      expect(filtered.text.split('\r\n')).toHaveLength(5); // encabezado + 3 días + línea final
    });

    it('no incluye movimientos de otras cuentas ni los borrados', async () => {
      const ana = await signUp('ana@example.com');
      const beto = await signUp('beto@example.com');
      await addTx(ana, { amount: 111, date: '2026-10-05', category: 'Comida', note: 'de ana' });
      await addTx(beto, { amount: 222, date: '2026-10-05', category: 'Comida', note: 'de beto' });

      const list = await request(app).get(`${API}/transactions`).set(bearer(ana.token));
      const id = list.body.data[0].id as string;
      await request(app).delete(`${API}/transactions/${id}`).set(bearer(ana.token));

      const res = await request(app).get(`${API}/transactions/export`).set(bearer(ana.token));
      expect(res.text).not.toContain('de ana'); // borrado
      expect(res.text).not.toContain('de beto'); // de otra cuenta
    });

    it('con ?format=xlsx descarga un Excel con resumen, movimientos y totales', async () => {
      const ana = await signUp('ana@example.com');
      await addTx(ana, { type: 'INCOME', amount: 100000, date: '2026-10-01', category: 'Sueldo' });
      await addTx(ana, { amount: 1500.5, date: '2026-10-05', category: 'Comida' });

      const res = await request(app)
        .get(`${API}/transactions/export?format=xlsx&from=2026-10-01&to=2026-10-31`)
        .set(bearer(ana.token))
        // El .xlsx es binario: con 'blob' supertest entrega la respuesta como Buffer
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="movimientos-\d{4}-\d{2}-\d{2}\.xlsx"$/,
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as unknown as ExcelJS.Buffer);
      expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Movimientos']);

      const summary = workbook.getWorksheet('Resumen')!;
      expect(summary.getCell('B4').value).toMatchObject({ result: 100000 }); // ingresos
      expect(summary.getCell('B5').value).toMatchObject({ result: 1500.5 }); // gastos
      expect(summary.getCell('B6').value).toMatchObject({ result: 98499.5 }); // balance
      expect(String(workbook.getWorksheet('Movimientos')!.getCell('A2').value)).toContain(
        'Período: 01/10/2026 al 31/10/2026',
      );
    });

    it('rechaza un formato de exportación desconocido', async () => {
      const ana = await signUp('ana@example.com');
      const res = await request(app)
        .get(`${API}/transactions/export?format=pdf`)
        .set(bearer(ana.token));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('responde 400 si los filtros son inválidos', async () => {
      const ana = await signUp('ana@example.com');
      const res = await request(app)
        .get(`${API}/transactions/export?from=2026-10-31&to=2026-10-01`)
        .set(bearer(ana.token));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /exchange-rates/usd', () => {
    const providerBody = {
      compra: 1545,
      venta: 1565.5,
      fechaActualizacion: '2026-10-22T18:00:00.000Z',
    };

    it('exige sesión', async () => {
      const res = await request(app).get(`${API}/exchange-rates/usd`);
      expect(res.status).toBe(401);
    });

    it('devuelve la cotización del tipo pedido y la guarda para el siguiente pedido', async () => {
      const ana = await signUp('ana@example.com');
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(providerBody))));

      const first = await request(app)
        .get(`${API}/exchange-rates/usd?type=blue`)
        .set(bearer(ana.token));
      const second = await request(app)
        .get(`${API}/exchange-rates/usd?type=blue`)
        .set(bearer(ana.token));

      expect(first.status).toBe(200);
      expect(first.body.data).toEqual({
        type: 'blue',
        buy: '1545.00',
        sell: '1565.50',
        updatedAt: '2026-10-22T18:00:00.000Z',
        source: 'dolarapi.com',
      });
      expect(second.body.data).toEqual(first.body.data);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('usa el dólar oficial si no se indica el tipo', async () => {
      const ana = await signUp('ana@example.com');
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(providerBody))));

      const res = await request(app).get(`${API}/exchange-rates/usd`).set(bearer(ana.token));

      expect(res.body.data.type).toBe('oficial');
      expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('https://dolarapi.com/v1/dolares/oficial');
    });

    it('rechaza un tipo de dólar desconocido sin consultar la fuente', async () => {
      const ana = await signUp('ana@example.com');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const res = await request(app)
        .get(`${API}/exchange-rates/usd?type=inventado`)
        .set(bearer(ana.token));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('responde 502 con un mensaje claro si la fuente no responde', async () => {
      const ana = await signUp('ana@example.com');
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red'));

      const res = await request(app).get(`${API}/exchange-rates/usd`).set(bearer(ana.token));

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('RATE_PROVIDER_UNAVAILABLE');
    });
  });
});
