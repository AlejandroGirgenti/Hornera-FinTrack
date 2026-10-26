import { COUNTRY_CODES } from '@fintrack/shared';

export interface CountryOption {
  value: string;
  label: string;
}

let cached: CountryOption[] | undefined;

/**
 * Países para los desplegables, con el nombre en español (lo da el propio navegador con
 * Intl.DisplayNames) y ordenados alfabéticamente.
 */
export function countryOptions(): CountryOption[] {
  if (cached) return cached;
  const names = new Intl.DisplayNames(['es-AR'], { type: 'region' });
  cached = COUNTRY_CODES.map((code) => ({ value: code, label: names.of(code) ?? code })).sort(
    (a, b) => a.label.localeCompare(b.label, 'es'),
  );
  return cached;
}

/** Nombre de un país a partir de su código (o el código mismo si no se reconoce). */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return countryOptions().find((option) => option.value === code)?.label ?? code;
}
