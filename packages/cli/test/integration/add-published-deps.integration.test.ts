/**
 * Clean-consumer integration test for published @rafters/* dependencies.
 *
 * This is the real gate for the risk the caller stated (reflection 019fce10):
 * "no in-repo gate tests the published install path." It runs the REAL
 * `rafters add` binary against a fresh fixture project whose only knowledge of
 * `@rafters/color-utils` is a locally-served registry -- then proves the
 * declared dependency is actually installed and resolvable by `tsc --noEmit`,
 * end to end, with no monorepo path aliases in play.
 *
 * The published packages are not on the public npm registry (this issue wires
 * publishing but does not ship it), so the test stands up a minimal local npm
 * registry that serves freshly-packed tarballs of the ACTUAL source of
 * `@rafters/color-utils` and its `@rafters/shared` dependency. The consumer's
 * `.npmrc` scopes only `@rafters/*` to that local registry; every other
 * dependency (colorjs.io, zod, apca-w3, typescript) resolves from the real npm
 * registry, exactly as a genuine published install would. This is the standard
 * "pack then install from a registry" technique -- the tarballs are the exact
 * bytes `pnpm publish` would upload.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupFixture } from '../fixtures/projects.js';
import { createInitializedFixture, execCli, execTsc, fixtureFileExists } from './helpers.js';

const here = fileURLToPath(new URL('.', import.meta.url));
// packages/cli/test/integration -> packages
const packagesDir = join(here, '../../../');

interface PackedPackage {
  name: string;
  version: string;
  manifest: Record<string, unknown>;
  buf: Buffer;
  integrity: string;
}

/**
 * Pack a workspace package to `destDir` via `pnpm pack` (which resolves
 * workspace:* / catalog: specifiers to concrete versions, just like publish),
 * then load its tarball bytes, npm integrity, and resolved manifest.
 */
function packPackage(pkgDirName: string, destDir: string): PackedPackage {
  const pkgDir = join(packagesDir, pkgDirName);
  const stdout = execFileSync('pnpm', ['pack', '--pack-destination', destDir], {
    cwd: pkgDir,
    encoding: 'utf-8',
  });
  const tgzPath = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.tgz'))
    .at(-1);
  if (!tgzPath) {
    throw new Error(`pnpm pack produced no tarball path for ${pkgDirName}:\n${stdout}`);
  }
  const buf = readFileSync(tgzPath);
  const integrity = `sha512-${createHash('sha512').update(buf).digest('base64')}`;
  const manifestJson = execFileSync('tar', ['-xzOf', tgzPath, 'package/package.json'], {
    encoding: 'utf-8',
  });
  const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
  const name = String(manifest.name);
  const version = String(manifest.version);
  return { name, version, manifest, buf, integrity };
}

const ITEM_NAME = 'test-color-consumer';
// Written to src/lib/primitives/<name>.ts in a Vite fixture (transformPath maps
// the `lib/primitives/` prefix onto config.primitivesPath).
const WRITTEN_FILE = `src/lib/primitives/${ITEM_NAME}.ts`;

/** The registry item whose delivered file declares the @rafters/* dependency. */
function registryItem(): unknown {
  return {
    name: ITEM_NAME,
    type: 'primitive',
    primitives: [],
    files: [
      {
        path: `lib/primitives/${ITEM_NAME}.ts`,
        content:
          "import { buildColorValue } from '@rafters/color-utils';\n" +
          'export const consumerColorBuilder = buildColorValue;\n',
        dependencies: ['@rafters/color-utils@0.0.1'],
      },
    ],
  };
}

describe('rafters add - published @rafters/* dependency (clean consumer)', () => {
  let server: Server;
  let port = 0;
  let packDir = '';
  let fixturePath = '';

  beforeAll(async () => {
    packDir = mkdtempSync(join(tmpdir(), 'rafters-pack-'));
    const packed: Record<string, PackedPackage> = {};
    for (const dir of ['shared', 'color-utils']) {
      const pkg = packPackage(dir, packDir);
      packed[pkg.name] = pkg;
    }

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = decodeURIComponent(req.url ?? '');

      // rafters registry routes.
      if (url.startsWith('/registry/')) {
        // A bare `add <name>` probes the `components` (ui) folder first, then
        // `primitives`; serve the item only from `primitives` and 404 the rest
        // so fetchItem falls through to it.
        if (url === `/registry/primitives/${ITEM_NAME}.json`) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(registryItem()));
          return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end('{"error":"not found"}');
        return;
      }

      // npm registry tarball route: /<name>/-/<file>.tgz
      const tarballMatch = url.match(/^\/(.+)\/-\/[^/]+\.tgz$/);
      if (tarballMatch) {
        const pkg = packed[tarballMatch[1] ?? ''];
        if (!pkg) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        res.end(pkg.buf);
        return;
      }

      // npm registry packument route: /<name>
      const pkg = packed[url.replace(/^\//, '')];
      if (!pkg) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end('{"error":"not found"}');
        return;
      }
      const tarballFile = `${pkg.name.split('/').pop()}-${pkg.version}.tgz`;
      const packument = {
        name: pkg.name,
        'dist-tags': { latest: pkg.version },
        versions: {
          [pkg.version]: {
            ...pkg.manifest,
            dist: {
              tarball: `http://127.0.0.1:${port}/${pkg.name}/-/${tarballFile}`,
              integrity: pkg.integrity,
            },
          },
        },
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(packument));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('registry server did not bind a TCP port');
    }
    port = address.port;
  }, 120_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (packDir) {
      rmSync(packDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    if (fixturePath) {
      await cleanupFixture(fixturePath);
      fixturePath = '';
    }
  });

  it('installs a declared @rafters/* dependency into a fresh consumer', async () => {
    fixturePath = await createInitializedFixture('vite-shadcn-v4');

    // Reduce the fixture to a minimal installable consumer: keep typescript so
    // `tsc` is available; drop react/vite/tailwind so the real install stays
    // lean. Pin the package manager so detection is deterministic (pnpm),
    // independent of the ambient npm_config_user_agent.
    writeFileSync(
      join(fixturePath, 'package.json'),
      JSON.stringify(
        {
          name: 'consumer',
          version: '0.0.0',
          private: true,
          packageManager: 'pnpm@11.9.0',
          devDependencies: { typescript: '5.9.3' },
        },
        null,
        2,
      ),
    );

    // Scope only @rafters/* to the local registry; everything else (colorjs.io,
    // zod, apca-w3, typescript) resolves from the real npm registry.
    writeFileSync(join(fixturePath, '.npmrc'), `@rafters:registry=http://127.0.0.1:${port}/\n`);

    // Typecheck only the delivered file. color-utils ships ambient module
    // declarations for its untyped runtime deps (apca-w3, colorjs.io) as
    // src/*.d.ts; load them the same way the monorepo's own consumer does
    // (packages/design-tokens/tsconfig.json includes ../color-utils/src/**/*.d.ts).
    writeFileSync(
      join(fixturePath, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            module: 'esnext',
            moduleResolution: 'bundler',
            target: 'esnext',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: [],
          },
          include: [WRITTEN_FILE, 'node_modules/@rafters/color-utils/src/**/*.d.ts'],
        },
        null,
        2,
      ),
    );

    // Real CLI binary, real package-manager install (a cold install downloads
    // colorjs.io/zod/apca-w3 from npm, so allow generous time).
    const result = await execCli(
      fixturePath,
      ['add', ITEM_NAME, '--registry-url', `http://127.0.0.1:${port}`],
      { timeoutMs: 120_000 },
    );

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fixtureFileExists(fixturePath, WRITTEN_FILE)).toBe(true);
    // The declared @rafters/* dependency is actually installed (not skipped).
    expect(fixtureFileExists(fixturePath, 'node_modules/@rafters/color-utils')).toBe(true);

    // The import resolves under a real typecheck -- the clean-consumer proof.
    const typecheck = await execTsc(fixturePath, ['--noEmit'], { timeoutMs: 60_000 });
    expect(typecheck.exitCode, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);
  }, 180_000);
});
