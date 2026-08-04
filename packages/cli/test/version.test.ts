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
import { describe, expect, it } from 'vitest';
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
