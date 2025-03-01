import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true, // Listen on all local IPs
    port: 5173, // Default port
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },
  // Configuration pour permettre l'utilisation de modules natifs
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  }
});