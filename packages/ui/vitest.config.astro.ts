/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/**
 * The `astro` project of vitest.config.ts, kept as its own file because
 * importing a `.astro` file needs Astro's own Vite transform, which
 * `getViteConfig` merges in and which must own this project's plugin set:
 * `extends: false` keeps the root's react plugin out of it.
 *
 * environment is 'node', not happy-dom: from Astro 6 the Container API cannot
 * render into a Vitest client environment (v6 upgrade guide, PR #14895);
 * verified on 6.4.8 and 7.3.2 (legion 01a08406) that every `renderToString`
 * throws NoMatchingRenderer under happy-dom and passes under node. The DOM
 * the pre-trim conformance files parse into comes from vitest.setup.astro.ts.
 */
export default getViteConfig({
  test: {
    name: 'astro',
    extends: false,
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.astro.ts'],
    include: [
      'test/**/*.astro.spec.ts',
      'test/**/*.astro.a11y.ts',
      // Pre-trim conformance files; the trim renames them to the two globs above.
      'test/**/*.astro.conformance.test.ts',
    ],
  },
});
