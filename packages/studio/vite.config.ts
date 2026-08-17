import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { studioApiPlugin } from './src/api/vite-plugin.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectPath = process.env.RAFTERS_PROJECT_PATH || process.cwd();

export default defineConfig({
  plugins: [react(), tailwindcss(), studioApiPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@rafters-output': resolve(projectPath, '.rafters', 'output'),
    },
  },
  optimizeDeps: {
    include: ['@rafters/color-utils', '@rafters/design-tokens', '@rafters/shared'],
  },
  ssr: {
    noExternal: [
      '@rafters/color-utils',
      '@rafters/design-tokens',
      '@rafters/shared',
      '@rafters/math-utils',
    ],
  },
  server: {
    port: 7777,
    strictPort: true,
    proxy: {
      '/api/color': {
        target: 'https://api.rafters.studio',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/color/, '/color'),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
