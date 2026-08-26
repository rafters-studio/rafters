/**
 * Install-path verification for the editor-primitive relocation (#2136).
 *
 * The move puts 25 primitives under `packages/ui/src/primitives/editor/` in
 * SOURCE, but the registry must still serve them at the UNCHANGED flat consumer
 * path (`lib/primitives/<name>.ts`). Source tests prove discovery; only an
 * actual `rafters add` against a clean consumer proves the PUBLISHED install
 * path -- the exact gap #2018 left open ("every gate tests SOURCE; nothing
 * tests the PUBLISHED INSTALL PATH").
 *
 * This test self-hosts the prebuilt registry (`apps/registry/dist`, produced by
 * `pnpm --filter @rafters/registry build`) over an ephemeral in-process HTTP
 * server -- a test harness, not a dev server. It skips when that build is
 * absent (mirroring add.spec.ts's dev-server skipIf), so it never blocks a
 * unit-only run while still guarding the install path whenever the registry is
 * built (CI, release, manual verification).
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
const DIST_AVAILABLE = existsSync(join(distDir, 'registry/primitives/block-canvas.json'));

if (!DIST_AVAILABLE) {
  console.warn('registry dist not built; #2136 install-path test skipped.');
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

describe('rafters add installs a relocated editor primitive (#2136)', () => {
  it.skipIf(!DIST_AVAILABLE)(
    'installs block-canvas + its transitive closure FLAT, with no editor/ nesting',
    async () => {
      fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
      const result = await execCli(fixturePath, [
        'add',
        'block-canvas',
        '--registry-url',
        registryUrl,
      ]);

      // Loud success, not a silent no-op.
      expect(result.stderr).not.toMatch(/Cannot find module/);
      expect(result.exitCode).toBe(0);

      // Served flat: the consumer path is unchanged by the source move.
      expect(fixtureFileExists(fixturePath, 'lib/primitives/block-canvas.ts')).toBe(true);
      expect(fixtureFileExists(fixturePath, 'lib/primitives/editor/block-canvas.ts')).toBe(false);

      // The `../memory`/`../types`-style behavior siblings a nested primitive
      // reaches were flattened, so the transitive closure still installs flat.
      expect(fixtureFileExists(fixturePath, 'lib/primitives/keyboard-handler.ts')).toBe(true);
      expect(fixtureFileExists(fixturePath, 'lib/primitives/types.ts')).toBe(true);

      // No installed file leaks the editor/ source nesting into an import.
      const installed = readFileSync(join(fixturePath, 'lib/primitives/block-canvas.ts'), 'utf-8');
      expect(installed).not.toContain('primitives/editor/');
    },
    30000,
  );

  it.skipIf(!DIST_AVAILABLE)(
    'command installs across the boundary: fuzzyMatch resolves to flat command-palette',
    async () => {
      fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
      const result = await execCli(fixturePath, ['add', 'command', '--registry-url', registryUrl]);

      expect(result.stderr).not.toMatch(/Cannot find module/);
      expect(result.exitCode).toBe(0);
      expect(fixtureFileExists(fixturePath, 'lib/primitives/command-palette.ts')).toBe(true);

      const behavior = readFileSync(
        join(fixturePath, 'components/ui/command.behavior.ts'),
        'utf-8',
      );
      expect(behavior).toContain('/lib/primitives/command-palette');
      expect(behavior).not.toContain('primitives/editor/');
    },
    30000,
  );
});
