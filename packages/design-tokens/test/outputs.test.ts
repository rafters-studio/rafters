/**
 * regenerateOutputs write + prune guard (#1944).
 *
 * regenerateOutputs is the single path that turns a TokenRegistry into the
 * on-disk `.rafters/output` artifacts. It used to only ever write files for
 * enabled exports -- toggling an export off left its last-written file
 * sitting on disk for a consumer (or a stale HMR client) to keep reading.
 * These tests pin two things: the written-filename list stays exhaustive and
 * accurate (a mismatch there would delete a file the call just wrote), and a
 * disabled export's stale artifact is swept on the next regen while an
 * enabled export's file survives untouched.
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../src/index.js';
import { type OutputExports, regenerateOutputs } from '../src/outputs.js';

const ALL_ON: OutputExports = {
  tailwind: true,
  typescript: true,
  dtcg: true,
  compiled: true,
  documentation: true,
};

const ALL_OFF: OutputExports = {
  tailwind: false,
  typescript: false,
  dtcg: false,
  compiled: false,
  documentation: false,
};

const KNOWN_FILES = [
  'rafters.css',
  'rafters.ts',
  'rafters.json',
  'rafters.standalone.css',
  'rafters.documentation.css',
];

function baseRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  return new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

describe('regenerateOutputs (#1944)', () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'rafters-outputs-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  it('writes exactly one file per enabled export, matching the known filename set', async () => {
    const written = await regenerateOutputs(baseRegistry(), { outputDir, exports: ALL_ON });

    expect(written.sort()).toEqual([...KNOWN_FILES].sort());
    for (const filename of KNOWN_FILES) {
      expect(existsSync(join(outputDir, filename))).toBe(true);
    }
  }, 20000);

  it('writes nothing when every export is disabled', async () => {
    const written = await regenerateOutputs(baseRegistry(), { outputDir, exports: ALL_OFF });

    expect(written).toEqual([]);
    for (const filename of KNOWN_FILES) {
      expect(existsSync(join(outputDir, filename))).toBe(false);
    }
  });

  it('removes a disabled export artifact left over from a prior regen', async () => {
    // First regen with everything on -- all five files land on disk.
    await regenerateOutputs(baseRegistry(), { outputDir, exports: ALL_ON });
    for (const filename of KNOWN_FILES) {
      expect(existsSync(join(outputDir, filename))).toBe(true);
    }

    // Second regen only re-enables tailwind + typescript.
    const written = await regenerateOutputs(baseRegistry(), {
      outputDir,
      exports: {
        tailwind: true,
        typescript: true,
        dtcg: false,
        compiled: false,
        documentation: false,
      },
    });

    expect(written.sort()).toEqual(['rafters.css', 'rafters.ts']);
    expect(existsSync(join(outputDir, 'rafters.css'))).toBe(true);
    expect(existsSync(join(outputDir, 'rafters.ts'))).toBe(true);
    expect(existsSync(join(outputDir, 'rafters.json'))).toBe(false);
    expect(existsSync(join(outputDir, 'rafters.standalone.css'))).toBe(false);
    expect(existsSync(join(outputDir, 'rafters.documentation.css'))).toBe(false);
  }, 20000);

  it('never touches a file outside the known output filename set', async () => {
    const untouched = join(outputDir, 'notes.txt');
    writeFileSync(untouched, 'keep me');

    await regenerateOutputs(baseRegistry(), { outputDir, exports: ALL_OFF });

    expect(existsSync(untouched)).toBe(true);
    await expect(readFile(untouched, 'utf-8')).resolves.toBe('keep me');
  });

  it('does not throw when there is nothing stale to prune', async () => {
    await expect(
      regenerateOutputs(baseRegistry(), {
        outputDir,
        exports: {
          tailwind: true,
          typescript: false,
          dtcg: false,
          compiled: false,
          documentation: false,
        },
      }),
    ).resolves.toEqual(['rafters.css']);
  });
});
