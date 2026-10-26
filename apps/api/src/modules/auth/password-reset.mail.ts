import { escapeHtml } from '../../lib/mailer';
import type { Mail } from '../../lib/mailer';

/** Cuánto dura el enlace de recuperación. */
export const RESET_TOKEN_TTL_MINUTES = 60;

export function buildResetPasswordMail(params: { to: string; name: string; link: string }): Mail {
  const { to, name, link } = params;
  const subject = 'Restablecé tu contraseña de Hornera FinTrack';

  const text = [
    `Hola ${name},`,
    '',
    'Recibimos un pedido para restablecer la contraseña de tu cuenta de Hornera FinTrack.',
    `Entrá a este enlace para elegir una nueva (vence en ${RESET_TOKEN_TTL_MINUTES} minutos y sirve una sola vez):`,
    '',
    link,
    '',
    'Si no fuiste vos, ignorá este correo: tu contraseña actual sigue funcionando.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f4fb;font-family:Arial,Helvetica,sans-serif;color:#1a1722">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#4a2b8a">Hornera FinTrack</h1>
      <p style="margin:0 0 12px">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 20px">Recibimos un pedido para restablecer la contraseña de tu cuenta. El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos y sirve una sola vez.</p>
      <p style="margin:0 0 24px">
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#4a2b8a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Elegir una nueva contraseña</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#5b5668">Si el botón no funciona, copiá y pegá este enlace en el navegador:</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;color:#5b5668">${escapeHtml(link)}</p>
      <p style="margin:0;font-size:13px;color:#5b5668">Si no fuiste vos, ignorá este correo: tu contraseña actual sigue funcionando.</p>
    </div>
  </body>
</html>`;

  return { to, subject, text, html };
}
