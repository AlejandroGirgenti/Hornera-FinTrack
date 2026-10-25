/**
 * Color de acento ("secundario") de la interfaz. Cada persona puede elegir el suyo en
 * Configuración. Como los botones llevan texto blanco, el color tiene que ser lo bastante oscuro
 * para que se lea: se exige un contraste mínimo de 4,5:1 (nivel AA de WCAG) contra el blanco.
 */
export const DEFAULT_ACCENT_COLOR = '#4a2b8a'; // midnight purple

export const MIN_ACCENT_CONTRAST = 4.5;

export interface AccentPreset {
  name: string;
  value: string;
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { name: 'Midnight purple', value: DEFAULT_ACCENT_COLOR },
  { name: 'Índigo', value: '#4338ca' },
  { name: 'Azul', value: '#1d4ed8' },
  { name: 'Verde azulado', value: '#0f766e' },
  { name: 'Verde bosque', value: '#15803d' },
  { name: 'Barro', value: '#9a3412' },
  { name: 'Rosa', value: '#be185d' },
  { name: 'Grafito', value: '#44403c' },
];

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Luminancia relativa de un color #rrggbb según WCAG (0 = negro, 1 = blanco). */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Contraste del color contra el blanco (de 1 a 21). */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

/** ¿Es un #rrggbb válido y con contraste suficiente contra el texto blanco? */
export function isReadableAccent(hex: string): boolean {
  return HEX_COLOR_PATTERN.test(hex) && contrastWithWhite(hex) >= MIN_ACCENT_CONTRAST;
}
