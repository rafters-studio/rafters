/**
 * Consumer symptom for #2800: class names in the comments of delivered files
 * compiled into the consumer's CSS as utilities nothing used.
 *
 * A `vite-no-shadcn` fixture is initialised and given button, card, dialog,
 * combobox and container from the prebuilt registry (`apps/registry/dist`,
 * served over an ephemeral in-process HTTP server, as in
 * add-hover-surfaces.integration.test.ts). Its entry CSS is compiled with
 * Tailwind v4 as installed, then again with every installed file's comments
 * removed; the two must carry the same class-like selectors (a class holding
 * `-`, `:`, `[`, `/`, `@` or `(`, as the guard defines it). Bare-word
 * selectors such as `.invisible` and `.filter` come from prose and are out of
 * scope. Skips when the registry dist is absent.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'vite/rolldown/utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { execCli, readConfig } from './helpers.js';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
const distDir = join(repoRoot, 'apps/registry/dist');
const DIST_AVAILABLE = existsSync(join(distDir, 'registry/components/button.json'));

if (!DIST_AVAILABLE) {
  console.warn('registry dist not built; #2800 comment-classes test skipped.');
  console.warn('   Build with: pnpm --filter @rafters/registry build');
}

const tailwindBin = join(
  dirname(createRequire(import.meta.url).resolve('@tailwindcss/cli/package.json')),
  'dist',
  'index.mjs',
);

let server: Server | undefined;
let registryUrl = '';
let fixturePath = '';
let outDir = '';

beforeAll(async () => {
  if (!DIST_AVAILABLE) return;
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      const buf = await readFile(join(distDir, pathname));
      res.writeHead(200, { 'Content-Type': 'application/json' });
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
  if (fixturePath) await cleanupFixture(fixturePath);
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(path)) ? [path] : [];
  });
}

/** A class selector whose unescaped class name is class-like. */
function isClassLike(selector: string): boolean {
  return selector.startsWith('.') && /[-:[/@(]/.test(selector.slice(1).replaceAll('\\', ''));
}

/** Compile the entry CSS with the Tailwind v4 CLI and return its selectors. */
function compiledSelectors(cwd: string, entry: string, out: string): Set<string> {
  const result = spawnSync('node', [tailwindBin, '-i', entry, '-o', out], {
    cwd,
    encoding: 'utf-8',
  });
  expect(result.status, result.stderr).toBe(0);
  const css = readFileSync(out, 'utf-8');
  return new Set([...css.matchAll(/^\s*([^{}@\n][^{}\n]*?)\s*\{/gm)].map((m) => m[1]));
}

describe('a consumer compiles no utility from rafters comments (#2800)', () => {
  it.skipIf(!DIST_AVAILABLE)(
    'vite-no-shadcn has the same selectors with every installed comment removed',
    async () => {
      fixturePath = await createFixture('vite-no-shadcn');
      const init = await execCli(fixturePath, ['init', '--agent']);
      expect(init.exitCode, init.stderr).toBe(0);
      const add = await execCli(fixturePath, [
        'add',
        'button',
        'card',
        'dialog',
        'combobox',
        'container',
        '--agent',
        '--registry-url',
        registryUrl,
      ]);
      expect(add.exitCode, add.stderr).toBe(0);

      const config = await readConfig(fixturePath);
      const cssPath = typeof config.cssPath === 'string' ? config.cssPath : 'src/index.css';
      const entry = join(fixturePath, cssPath);

      outDir = mkdtempSync(join(tmpdir(), 'rafters-2800-'));
      const shipped = compiledSelectors(fixturePath, entry, join(outDir, 'shipped.css'));
      expect(shipped.has('.bg-blue-500')).toBe(false);
      expect(shipped.has('.hover\\:bg-blue-500')).toBe(false);

      for (const file of sourceFiles(join(fixturePath, 'src'))) {
        const text = readFileSync(file, 'utf-8');
        // A space keeps the tokens either side of a comment apart.
        const bare = parseSync(file, text)
          .comments.toReversed()
          .reduce((out, c) => `${out.slice(0, c.start)} ${out.slice(c.end)}`, text);
        writeFileSync(file, bare);
      }
      const stripped = compiledSelectors(fixturePath, entry, join(outDir, 'stripped.css'));

      expect([...shipped].filter((s) => isClassLike(s) && !stripped.has(s))).toEqual([]);
      expect([...stripped].filter((s) => isClassLike(s) && !shipped.has(s))).toEqual([]);
    },
  );
});
