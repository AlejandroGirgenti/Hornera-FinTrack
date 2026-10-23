/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API cuando no está en el mismo origen que el frontend. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
