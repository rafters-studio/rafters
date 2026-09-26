import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // These five are Playwright specs (playwright.config.ts), not vitest
    // tests -- named *.spec.ts like the rest of the suite since #2329
    // retired the *.e2e.ts convention, so they must be excluded by path
    // rather than by a naming pattern.
    exclude: [
      '**/*.a11y.{ts,tsx}',
      '**/node_modules/**',
      '**/dist/**',
      'test/editor/editor-capture.spec.ts',
      'test/infrastructure/playwright.spec.ts',
      'test/motion/hover-reveal.spec.ts',
      'test/presence/presence-exit.spec.ts',
      'test/presence/presence-race.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      exclude: [
        'test/**',
        '**/*.config.*',
        '**/dist/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.a11y.{ts,tsx}',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
