/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';

const ICON_MODULE = '/lucide-react/dist/esm/icons/';
/** What every visitor's first page loads: the app's entry and the homepage, with all they import statically. */
const FIRST_LOAD_ROOTS = ['./src/main.tsx', './src/routes/public/home/home-page.tsx'].map((path) =>
  normalizePath(fileURLToPath(new URL(path, import.meta.url))),
);
const ICON_IMPORT = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
let firstLoadIcons: Set<string> | undefined;

/** "CarFront" → "car-front", "Undo2" → "undo-2": lucide's file for an icon. */
const iconFile = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();

/**
 * The icons used by our own modules reachable from `roots` through static imports (lazy-loaded pages are
 * left out). Read from each module's imports, because lucide-react's index imports every icon there is.
 */
function iconsOf(
  roots: string[],
  getModuleInfo: (id: string) => { importedIds: readonly string[]; code: string | null } | null,
): Set<string> {
  const icons = new Set<string>();
  const seen = new Set<string>();
  const queue = [...roots];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (seen.has(id) || id.includes('/node_modules/')) continue;
    seen.add(id);
    const info = getModuleInfo(id);
    for (const [, names = ''] of (info?.code ?? '').matchAll(ICON_IMPORT)) {
      for (const name of names.split(',')) {
        const icon = name.trim().split(/\s+/)[0];
        if (icon && icon !== 'type') icons.add(iconFile(icon));
      }
    }
    queue.push(...(info?.importedIds ?? []));
  }
  return icons;
}

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
      output: {
        // Rollup gives each icon shared by two pages a file of its own, and thirty tiny files cost more to
        // download than one. The icons of the first load go in a single file (plan §12.5).
        manualChunks(id, { getModuleInfo }) {
          if (!id.includes(ICON_MODULE)) return undefined;
          firstLoadIcons ??= iconsOf(FIRST_LOAD_ROOTS, getModuleInfo);
          const file = id.slice(id.indexOf(ICON_MODULE) + ICON_MODULE.length).replace(/\.m?js$/, '');
          return firstLoadIcons.has(file) ? 'icons' : undefined;
        },
      },
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
