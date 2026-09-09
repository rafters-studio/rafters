import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * One config, three projects, one per test tier (#2326):
 *
 * - `unit`: pure TS, behavior scores, classes, primitives, and the React/WC
 *   `.test` files, under happy-dom with isolation off.
 * - `browser`: React and Web Component `.spec` / `.a11y` files in real
 *   chromium through @vitest/browser-playwright.
 * - `astro`: SSR through the Container API, referenced by path because
 *   `getViteConfig` from `astro/config` must own that project's Vite plugins
 *   and must NOT inherit the react plugin (see vitest.config.astro.ts).
 *
 * `vitest run` from this directory runs all three in one invocation and the
 * JSON reporter writes one report per run (default path `.vitest/`, which is
 * gitignored) that veneer slices by `testResults[].name`.
 *
 * src/old/ and test/old/ are the quarantined pre-rewrite trees: nothing under
 * src/old/ runs; test/old/ only contributes its `.a11y` files, which stay in
 * the unit tier they run in today until the test-suite trim retires them.
 */
/**
 * `test:a11y` sets this to run the a11y tier alone. The include glob is the
 * switch because nothing else selects by glob: the CLI has no `--include`, its
 * positional filter is a substring match (which let `.a11y.test.ts` unit files
 * pass as a tier, #2222), and `--exclude` does not reach a project that sets
 * its own `exclude`.
 */
export const a11yOnly = process.env['VITEST_A11Y_ONLY'] === '1';

export default defineConfig({
  // Inherited by the two inline projects (extends: true); the astro project
  // opts out with extends: false so Astro's own transform owns its plugins.
  plugins: [react()],
  test: {
    globals: true,
    reporters: ['default', 'json'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/old/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          // Stop happy-dom from fetching iframe `src`s (and other subresources)
          // over the live network during component tests. Without this,
          // rendering a component that emits an iframe -- e.g. Embed with a
          // YouTube URL -- makes happy-dom fetch https://www.youtube-nocookie.com/
          // for real, which hangs preflight whenever that host is slow or
          // unreachable. Tests must never depend on network access.
          environmentOptions: {
            happyDOM: {
              settings: {
                // Same rationale as vitest.setup.astro.ts: this project
                // renders the same components under happy-dom, so a
                // disabled <script> module fetch or iframe page load must
                // never surface as a console.error the class-discard spies
                // count. navigation.disableChildFrameNavigation replaces the
                // deprecated disableIframePageLoading, which logs its refusal
                // through console.error unconditionally.
                disableJavaScriptFileLoading: true,
                handleDisabledFileLoadingAsSuccess: true,
                navigation: {
                  disableChildFrameNavigation: true,
                },
              },
            },
          },
          // Measured on Vitest 4.1 (legion 01a08321): 431 files / 6865 tests,
          // 68.2s isolated vs 12.9s with isolation off, all passing both ways.
          // Never a vm pool: vmForks exhausts the heap on this suite.
          isolate: false,
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'src/**/*.test.{ts,tsx}',
            'test/**/*.test.{ts,tsx}',
            'test/old/**/*.a11y.{ts,tsx}',
          ],
          exclude: [
            'src/old/**',
            'test/**/*.astro.*',
            // The one test/old file that evaluates src/old element code:
            // src/old/ui/badge.element defines the same `rafters-badge` tag
            // as src/components/badge/badge.element, and one shared realm
            // (isolate: false) holds one definition, so whichever file loads
            // second fails. Nothing under src/old runs; this keeps that true.
            'test/old/**/*.element.a11y.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: a11yOnly
            ? ['test/**/*.a11y.{ts,tsx}']
            : ['test/**/*.spec.{ts,tsx}', 'test/**/*.a11y.{ts,tsx}'],
          exclude: ['test/**/*.astro.*', 'src/old/**', 'test/old/**'],
          setupFiles: ['./test/a11y/setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            headless: true,
          },
        },
      },
      './vitest.config.astro.ts',
    ],
  },
});
