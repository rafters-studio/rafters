/**
 * Install-path verification for the CSS-only hover reveal (#2148).
 *
 * Tooltip, hover-card, and navigation-menu used to resolve two primitives that
 * no longer exist: `hover-delay.ts` (the JS hover-intent timers) and
 * `motion-tokens.ts` (a delivered file that imported `@rafters/design-tokens` at
 * runtime, #2132). Source tests prove the imports are gone from source; only an
 * actual `rafters add` against a clean consumer proves the PUBLISHED INSTALL
 * PATH -- the exact gap #2018 left open ("every gate tests SOURCE; nothing tests
 * the PUBLISHED INSTALL PATH"), and the one that would have shipped a component
 * whose dependency closure names a file the registry cannot serve.
 *
 * This test self-hosts the prebuilt registry (`apps/registry/dist`, produced by
 * `pnpm --filter @rafters/registry build`) over an ephemeral in-process HTTP
 * server -- a test harness, not a dev server. It skips when that build is
 * absent (mirroring add-editor-primitive.integration.test.ts), so it never
 * blocks a unit-only run while still guarding the install path whenever the
 * registry is built.
 */

import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupFixture } from '../fixtures/projects.js';
import { createInitializedFixture, execCli, fixtureFileExists } from './helpers.js';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
const distDir = join(repoRoot, 'apps/registry/dist');
const DIST_AVAILABLE = existsSync(join(distDir, 'registry/components/tooltip.json'));

if (!DIST_AVAILABLE) {
  console.warn('registry dist not built; #2148 install-path test skipped.');
  console.warn('   Build with: pnpm --filter @rafters/registry build');
}

const MIME: Record<string, string> = { '.json': 'application/json', '.html': 'text/html' };

let server: Server | undefined;
let registryUrl = '';
let fixturePath = '';

beforeAll(async () => {
  if (!DIST_AVAILABLE) return;
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      const buf = await readFile(join(distDir, pathname));
      res.writeHead(200, { 'Content-Type': MIME[extname(pathname)] ?? 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const addr = server?.address();
  if (addr && typeof addr === 'object') registryUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
});

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

/** The behaviour/tsx files each component installs, relative to the fixture. */
const INSTALLED: Record<string, readonly string[]> = {
  tooltip: ['components/ui/tooltip.behavior.ts', 'components/ui/tooltip.tsx'],
  'hover-card': ['components/ui/hover-card.behavior.ts', 'components/ui/hover-card.tsx'],
  'navigation-menu': [
    'components/ui/navigation-menu.behavior.ts',
    'components/ui/navigation-menu.tsx',
  ],
};

describe('rafters add: the hover surfaces install with no motion primitives (#2148)', () => {
  for (const [component, files] of Object.entries(INSTALLED)) {
    it.skipIf(!DIST_AVAILABLE)(
      `${component} installs cleanly, resolving neither hover-delay nor motion-tokens`,
      async () => {
        fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
        const result = await execCli(fixturePath, [
          'add',
          component,
          '--registry-url',
          registryUrl,
        ]);

        // Loud success, not a silent no-op.
        expect(result.stderr).not.toMatch(/Cannot find module/);
        expect(result.exitCode).toBe(0);

        // Neither retired primitive is pulled in as a resolved dependency.
        expect(fixtureFileExists(fixturePath, 'lib/primitives/hover-delay.ts')).toBe(false);
        expect(fixtureFileExists(fixturePath, 'lib/primitives/motion-tokens.ts')).toBe(false);

        for (const file of files) {
          expect(fixtureFileExists(fixturePath, file)).toBe(true);
          const installed = readFileSync(join(fixturePath, file), 'utf-8');
          expect(installed).not.toContain('primitives/hover-delay');
          expect(installed).not.toContain('primitives/motion-tokens');
          // No timer, and no timing literal: motion is CSS and tokens only.
          expect(installed).not.toContain('setTimeout');
        }
      },
      30000,
    );
  }
});
