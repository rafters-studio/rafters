import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { studioApiPlugin } from './src/api/vite-plugin';

// Project path is set by the CLI command `rafters studio`
const projectPath = process.env.RAFTERS_PROJECT_PATH || process.cwd();

export default defineConfig({
  plugins: [react(), tailwindcss(), studioApiPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@rafters-output': resolve(projectPath, '.rafters', 'output'),
    },
    // Resolve .js imports to .ts files (workspace packages use .js extensions in TS source)
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
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
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
