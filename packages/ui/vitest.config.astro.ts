/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
import { astroTestOptions } from './vitest.astro.shared';

/**
 * The `astro` project of vitest.config.ts, kept as its own file because
 * importing a `.astro` file needs Astro's own Vite transform, which
 * `getViteConfig` merges in and which must own this project's plugin set:
 * `extends: false` keeps the root's react plugin out of it.
 *
 * This is the Astro 7 leg of the matrix; the options it shares with the
 * Astro 6 leg (files, environment, setup) live in vitest.astro.shared.ts.
 */
export default getViteConfig({
  test: {
    ...astroTestOptions,
    name: 'astro',
    extends: false,
  },
});
