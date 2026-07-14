/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/**
 * The Astro render-adapter project (Spec 01 testing obligations): the
 * conformance harness is framework-agnostic, but importing a `.astro` file
 * needs Astro's own Vite transform, which the React project's plugin set
 * does not provide. `getViteConfig` merges that transform in; everything
 * else (globals, environment, setup) mirrors vitest.config.ts so the shared
 * harness (test/harness/conformance.ts) runs unmodified against Astro
 * output the same way it runs against React output.
 *
 * environment stays 'happy-dom': Astro 5.x still permits rendering via the
 * Container API into a Vitest client environment (removed in Astro 6 --
 * see the v6 upgrade notes -- at which point this project moves to
 * environment: 'node' and parses renderToString's HTML manually).
 */
export default getViteConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.astro.conformance.test.ts'],
  },
});
