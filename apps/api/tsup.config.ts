import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // El paquete compartido se publica como código TypeScript: hay que incluirlo en el bundle
  noExternal: ['@fintrack/shared'],
});
