import { describe, expect, it } from 'vitest';
import { RESET_TOKEN_TTL_MINUTES, buildResetPasswordMail } from './password-reset.mail';

const link = 'http://localhost:5173/restablecer-contrasena?token=abc123';

describe('buildResetPasswordMail', () => {
  it('incluye el enlace, el destinatario y cuánto dura', () => {
    const mail = buildResetPasswordMail({ to: 'ana@example.com', name: 'Ana', link });
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toContain('contraseña');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain(`${RESET_TOKEN_TTL_MINUTES} minutos`);
  });

  it('escapa el nombre en la versión HTML', () => {
    const mail = buildResetPasswordMail({
      to: 'x@example.com',
      name: '<script>alert(1)</script>',
      link,
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
