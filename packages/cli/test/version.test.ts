/**
 * `rafters --version` must report the version the package actually is.
 *
 * The original defect was a hardcoded '0.0.1' passed to commander, so a unit
 * test of the version resolver alone would have passed while the CLI kept
 * lying. This spawns the real entry point and reads its stdout, which is the
 * only thing that covers the wiring.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';
import { beforeAll, describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

const PACKAGE_ROOT = join(import.meta.dirname, '..');

async function packageVersion(): Promise<string> {
  const raw = await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (parsed !== null && typeof parsed === 'object' && 'version' in parsed) {
    const { version } = parsed as { version: unknown };
    if (typeof version === 'string') return version;
  }
  throw new Error('packages/cli/package.json has no version string');
}

describe('rafters --version', () => {
  it('resolves the version from the package manifest', async () => {
    expect(VERSION).toBe(await packageVersion());
  });

  it('prints the real version when the CLI is invoked', async () => {
    const { stdout } = await execa(
      join(PACKAGE_ROOT, 'node_modules/.bin/tsx'),
      [join(PACKAGE_ROOT, 'src/index.ts'), '--version'],
      { cwd: PACKAGE_ROOT },
    );

    expect(stdout.trim()).toBe(await packageVersion());
  }, 30_000);
});

/**
 * The bundle is the thing that ships, and the source path is not a proxy for it.
 *
 * #2021 exists because a version that is right locally and wrong from npm is
 * still a broken `--version`. The test above spawns tsx against `src/index.ts`,
 * where `new URL('../package.json', import.meta.url)` resolves from `src/` --
 * a layout npm never sees. Consumers execute `dist/index.js`, where the same
 * expression resolves one level up from `dist/`. A tsup `outDir` change, an
 * added code-split chunk in a subdirectory, or any relocation of the bundled
 * module breaks that resolution and the source-path test stays green.
 *
 * The build runs here rather than being skipped when `dist` is absent: a test
 * that quietly does nothing is the same empty signal this issue is about, and
 * `pnpm preflight` runs `test:unit` before `build`, so `dist` is normally
 * missing at this point.
 *
 * The spawn cannot cover the `files` array -- npm ships `package.json`
 * regardless of `files`, so a dropped `dist` entry would publish a package with
 * no binary at all while this spawn still passed against the local build. The
 * static assertion below is what covers that half.
 */
describe('the published bundle reports the same version', () => {
  beforeAll(async () => {
    await execa('pnpm', ['build'], { cwd: PACKAGE_ROOT });
  }, 240_000);

  it('prints the real version when the built dist entry is executed', async () => {
    const { stdout } = await execa('node', [join(PACKAGE_ROOT, 'dist/index.js'), '--version'], {
      cwd: PACKAGE_ROOT,
    });

    // Named explicitly: this is the value version.ts falls back to when
    // package.json cannot be resolved from the bundle's location, which is the
    // exact failure a relocated outDir produces.
    expect(stdout.trim()).not.toBe('0.0.0-unknown');
    expect(stdout.trim()).toBe(await packageVersion());
  }, 60_000);

  it('publishes the directory the bin entry points into', async () => {
    const raw = await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') throw new Error('unreadable package.json');
    const { bin, files } = parsed as { bin?: unknown; files?: unknown };
    if (bin === null || typeof bin !== 'object') throw new Error('package.json has no bin map');
    const { rafters } = bin as { rafters?: unknown };
    if (typeof rafters !== 'string') throw new Error('package.json has no bin.rafters');
    if (!Array.isArray(files)) throw new Error('package.json has no files array');

    const binDir = rafters.replace(/^\.\//, '').split('/')[0];
    expect(files).toContain(binDir);
  });
});
