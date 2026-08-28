import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'terminal.local',
      'chromatic-preview.boxpro.moscow',
      'chromatic-preview.77-91-193-144.sslip.io',
    ],
  },
  preview: {
    host: '0.0.0.0',
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
});
