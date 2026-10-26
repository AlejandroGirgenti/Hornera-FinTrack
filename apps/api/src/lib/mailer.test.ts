import { beforeEach, describe, expect, it } from 'vitest';
import { escapeHtml, sendMail, testOutbox } from './mailer';

describe('escapeHtml', () => {
  it('escapa los caracteres que podrían inyectar HTML', () => {
    expect(escapeHtml(`<b onclick="x()">Tom & 'Jerry'</b>`)).toBe(
      '&lt;b onclick=&quot;x()&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });

  it('deja igual un texto común', () => {
    expect(escapeHtml('Ana Pérez')).toBe('Ana Pérez');
  });
});

describe('sendMail en los tests', () => {
  beforeEach(() => {
    testOutbox.length = 0;
  });

  it('guarda el correo en la bandeja de pruebas en lugar de enviarlo', async () => {
    await sendMail({ to: 'a@b.com', subject: 'Hola', text: 'texto', html: '<p>texto</p>' });
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0]).toMatchObject({ to: 'a@b.com', subject: 'Hola' });
  });
});
