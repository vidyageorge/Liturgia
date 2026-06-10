import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Web (Render): absolute paths so /schedule etc. load assets correctly.
  // Capacitor APK build: set VITE_CAPACITOR_BUILD=true for relative paths.
  base: process.env.VITE_CAPACITOR_BUILD === 'true' ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
