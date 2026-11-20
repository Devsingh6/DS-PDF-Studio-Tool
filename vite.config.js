import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    // Current Chrome/Edge/Firefox/Safari support ES2022; avoid unnecessary
    // legacy transforms for this desktop-oriented document workspace.
    target: 'es2022',
    minify: true,
    assetsInlineLimit: 4096,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    // Use Rolldown's natural module graph splitting. PDF.js is dynamically
    // imported by App.jsx, keeping the initial workspace bundle smaller.
  },
});
