import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.a11y.{ts,tsx}',
      'test/**/*.test.{ts,tsx}',
      'test/**/*.a11y.{ts,tsx}',
    ],
    exclude: [
      'test/**/*.spec.{ts,tsx}',
      'test/**/*.e2e.{ts,tsx}',
      // Astro conformance tests import .astro files, which need Astro's own
      // Vite transform (vitest.config.astro.ts) -- the react-only plugin set
      // here cannot parse them.
      'test/**/*.astro.conformance.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    },
  },
});
