import { defineConfig } from 'vitest/config';

// Los tests son de lógica pura (sin DOM), por eso no hacen falta los plugins de React ni Tailwind
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
