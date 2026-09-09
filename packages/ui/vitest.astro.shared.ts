import { fileURLToPath } from 'node:url';
import type { ViteUserConfig } from 'vitest/config';

/**
 * The one description of the Astro test tier, consumed by both legs of the
 * Astro matrix (#2327): vitest.config.astro.ts (Astro 7, the workspace pin)
 * and test/astro-matrix/v6/vitest.config.ts (Astro 6, an isolated install).
 * Each leg wraps these options in ITS OWN `getViteConfig` from `astro/config`,
 * so the `.astro` transform comes from the major under test while the files,
 * the setup, and the environment stay identical.
 *
 * Paths are absolute because the two legs have different roots and Vitest
 * resolves `dir` and `setupFiles` against the root.
 *
 * environment is 'node', not happy-dom: from Astro 6 the Container API cannot
 * render into a Vitest client environment (v6 upgrade guide, PR #14895);
 * verified on 6.4.8 and 7.3.2 (legion 01a08406) that every `renderToString`
 * throws NoMatchingRenderer under happy-dom and passes under node. The DOM
 * the pre-trim conformance files parse into comes from vitest.setup.astro.ts.
 */
export const astroTestOptions = {
  globals: true,
  environment: 'node',
  dir: fileURLToPath(new URL('.', import.meta.url)),
  setupFiles: [fileURLToPath(new URL('./vitest.setup.astro.ts', import.meta.url))],
  include: [
    'test/**/*.astro.spec.ts',
    'test/**/*.astro.a11y.ts',
    // Pre-trim conformance files; the trim renames them to the two globs above.
    'test/**/*.astro.conformance.test.ts',
  ],
} satisfies NonNullable<ViteUserConfig['test']>;
