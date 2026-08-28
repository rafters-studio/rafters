import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // Stop happy-dom from fetching iframe `src`s (and other subresources) over
    // the live network during component tests. Without this, rendering a
    // component that emits an iframe -- e.g. Embed with a YouTube URL -- makes
    // happy-dom fetch https://www.youtube-nocookie.com/... for real, which
    // hangs preflight whenever that host is slow or unreachable. Tests must
    // never depend on network access.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableIframePageLoading: true,
        },
      },
    },
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
      // src/old/ is the quarantined pre-rewrite tree: outside the delivered
      // surface the registry serves, under a standing no-edits rule, and now
      // excluded from tsconfig too. Discovering its tests here is what put it
      // in front of anyone working in this package; nothing under it is
      // maintained, so nothing under it is run.
      'src/old/**',
      // Astro conformance tests import .astro files, which need Astro's own
      // Vite transform (vitest.config.astro.ts) -- the react-only plugin set
      // here cannot parse them.
      'test/**/*.astro.conformance.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/old/**'],
    },
  },
});
