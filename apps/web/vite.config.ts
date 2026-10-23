import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En desarrollo el navegador habla solo con Vite y este reenvía /api a la API.
    // Así la cookie de la sesión es del mismo origen y no hace falta configurar CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
