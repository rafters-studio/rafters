/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getViteConfig } from 'astro/config';
import { z } from 'zod';
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
 * land on this install, and the runner and the DOM the setup registers are
 * single instances. The list is every package this directory installs, read
 * from package.json so adding a dependency here cannot leave it off.
 *
 * The trap that remains: a package NOT installed here (a transitive one such
 * as `@astrojs/compiler`) still resolves from packages/ui if a test imports
 * it directly. Astro tests import `astro/*` only; anything else the 6 leg
 * must own goes into this directory's package.json.
 */
const root = fileURLToPath(new URL('.', import.meta.url));

const v6Package = z
  .object({ devDependencies: z.record(z.string(), z.string()) })
  .parse(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')));

export default getViteConfig(
  {
    root,
    resolve: {
      dedupe: Object.keys(v6Package.devDependencies),
    },
    test: {
      ...astroTestOptions,
      name: 'astro-v6',
    },
  },
  { root },
);
