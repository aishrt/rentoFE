/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    // dist/.vite/manifest.json lists each chunk's imports, for the JavaScript budget check (plan §12.5).
    manifest: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Zod's source has comments Rollup can't use as annotations; harmless noise in third-party code.
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return;
        defaultHandler(warning);
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Form tests type and wait a lot; the whole suite runs in parallel, so allow more than 5 s.
    testTimeout: 15_000,
    env: {
      VITE_API_URL: 'http://api.test',
    },
  },
});
