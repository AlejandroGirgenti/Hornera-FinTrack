/**
 * Convierte lo que escribe la persona ("1.500,50", "1500.5", "$ 2 000") al formato que espera la
 * API ("1500.50" → "1500.5"). Solo normaliza el texto: la validación (positivo, hasta 2 decimales)
 * la hace después el esquema compartido, el mismo que usa el servidor.
 *
 * - Con coma: la coma es el decimal y los puntos son separadores de miles ("1.500,50").
 * - Sin coma: un punto es decimal ("1500.5"), salvo que tenga forma de miles ("1.500", "2.000.000").
 */
export function normalizeNumberInput(raw: string): string {
  const text = raw.replace(/[\s$]|US/g, '');
  if (text.includes(',')) return text.replace(/\./g, '').replace(',', '.');
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) return text.replace(/\./g, '');
  return text;
}
