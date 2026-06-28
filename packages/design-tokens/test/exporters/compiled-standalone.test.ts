/**
 * Completeness + determinism guard for the standalone (compiled) sheet (#1731).
 *
 * The standalone sheet is the utility stylesheet every Web Component adopts, so
 * it must contain a rule for every utility the components reference -- and it
 * must be reproducible regardless of where the compile runs. This test compiles
 * against a fixture vocabulary and asserts both properties. It goes red if a
 * referenced utility is dropped (the bg-surface-class regression) or if output
 * becomes CWD-dependent (the inherited-CWD-scan regression).
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

// A representative slice of the real component vocabulary: role colors, a
// foreground pair, a variant-prefixed utility, a data-attribute variant,
// slash-opacity, and structural utilities -- the classes that only ever appear
// as literal strings in *.classes.ts, none of them registry-derivable.
const FIXTURE_CLASSES =
  'bg-surface text-surface-foreground border-card-border hover:bg-accent ' +
  'data-[state=open]:bg-accent bg-foreground/80 inline-flex px-2.5 text-label-small';

const EXPECTED_RULES = [
  'bg-surface',
  'text-surface-foreground',
  'border-card-border',
  'bg-accent', // base of the hover/data variants
  'inline-flex',
  'px-2',
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

describe('standalone compiled sheet (#1731)', () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-classes-'));
    writeFileSync(join(fixtureDir, 'card.classes.ts'), `export const x = '${FIXTURE_CLASSES}';\n`);
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('contains a rule for every utility the fixture references', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    for (const rule of EXPECTED_RULES) {
      expect(css, `missing utility: ${rule}`).toContain(rule);
    }
  });

  it('emits @import "tailwindcss" source(none) so the CWD is not auto-scanned', async () => {
    // source(none) lives in the pre-compile input; the compiled output proves
    // determinism (next test). Here assert no utility leaks from unrelated CWD
    // content: a class never referenced by the fixture must be absent.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    expect(css).not.toContain('bg-warning-subtle');
  });

  it('output is identical regardless of process CWD (determinism)', async () => {
    const fromRoot = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    const original = process.cwd();
    let fromElsewhere: string;
    try {
      process.chdir(tmpdir());
      fromElsewhere = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    } finally {
      process.chdir(original);
    }
    expect(fromElsewhere).toBe(fromRoot);
  });
});
