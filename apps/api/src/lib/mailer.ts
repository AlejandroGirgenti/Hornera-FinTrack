import { env } from '../config/env';
import { logger } from './logger';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Correos "enviados" durante los tests: no sale nada a la red y los tests pueden leerlos. */
export const testOutbox: Mail[] = [];

/** Escapa un texto para insertarlo dentro de HTML (por ejemplo, el nombre de la persona). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Envía un correo.
 * - En los tests lo guarda en `testOutbox`.
 * - Con RESEND_API_KEY lo envía por Resend (resend.com).
 * - Sin clave, en desarrollo lo muestra en el log de la API (ahí se ve el enlace para probar);
 *   en producción solo avisa que falta configurar el envío, sin escribir el enlace en los logs.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (env.isTest) {
    testOutbox.push(mail);
    return;
  }

  if (!env.RESEND_API_KEY) {
    if (env.isProduction) {
      logger.warn(
        { to: mail.to, subject: mail.subject },
        'Correo no enviado: falta RESEND_API_KEY',
      );
    } else {
      logger.info(
        { to: mail.to, subject: mail.subject, text: mail.text },
        'Correo no enviado (no hay RESEND_API_KEY): se muestra acá',
      );
    }
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }
}
