/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { getViteConfig } from 'astro/config';
import { astroTestOptions } from '../../../vitest.astro.shared';

/**
 * The Astro 6 leg of the matrix (#2327). Same files, setup, and environment
 * as the workspace's Astro 7 project (vitest.astro.shared.ts); only the
 * `astro` package differs, and it is the one installed in THIS directory.
 *
 * The test files and the `.astro` sources live under packages/ui, whose
 * node_modules holds Astro 7, so nearest-node_modules resolution from those
 * files would pick 7. `resolve.dedupe` makes Vite resolve the listed packages
 * from this root instead, for every importer: `astro/container` in a test
 * file and `astro/runtime/server/index.js` in compiled component output both
 * land on this install. vitest and happy-dom are deduped for the same reason,
 * so the runner and the DOM the setup registers are single instances.
 */
const root = fileURLToPath(new URL('.', import.meta.url));

export default getViteConfig(
  {
    root,
    resolve: {
      dedupe: ['astro', 'vitest', 'happy-dom'],
    },
    test: {
      ...astroTestOptions,
      name: 'astro-v6',
    },
  },
  { root },
);
