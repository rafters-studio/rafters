/**
 * Proof that the semantic motion layer (#1902 / #1903 / #1904) compiles to a
 * working consumer rule -- the task's CRITICAL gate.
 *
 * Three properties, each an acceptance criterion:
 *  1. A token-named `motion-*` class compiles to a real CSS rule carrying the
 *     transition longhand (property + duration var + easing var).
 *  2. The nested `@media (prefers-reduced-motion: reduce)` block survives
 *     compilation + minification (blueprint risk #1 -- the one shape the spike
 *     never compiled).
 *  3. The referenced `--duration-*` / `--ease-*` theme vars resolve to the
 *     perceptual / named-curve values, so the class is not a dangling ref.
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
  registryToTailwind,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

// motion-modal-in carries a reduced-motion override (opacity, 150ms); motion-hover
// is preserved unchanged (no @media block). Both exercised as literal classes.
const FIXTURE_CLASSES =
  'motion-modal-in motion-hover motion-expand opacity-0 data-[state=open]:opacity-100';

function baseRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  return new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

describe('semantic motion utilities compile (#1902/#1903/#1904)', () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-motion-'));
    writeFileSync(join(fixtureDir, 'x.classes.ts'), `export const x = '${FIXTURE_CLASSES}';\n`);
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('emits a motion-* @utility longhand referencing the duration/ease vars', () => {
    const css = registryToTailwind(baseRegistry());
    expect(css).toContain('@utility motion-modal-in {');
    expect(css).toContain('transition-property: opacity, transform;');
    expect(css).toContain('transition-duration: var(--duration-normal);');
    expect(css).toContain('transition-timing-function: var(--ease-enter);');
    // Nested reduced-motion override, longhand re-set.
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {');
    // Preserved-feedback token has no reduced-motion block.
    expect(css).toContain('@utility motion-hover {');
    // expand/collapse transition grid-template-rows, never height.
    expect(css).toContain('transition-property: grid-template-rows, opacity;');
    expect(css).not.toContain('transition-property: height');
    // The referenced theme vars carry the perceptual value and the named curve.
    expect(css).toContain('--duration-normal: 350ms;');
    expect(css).toContain('--ease-enter: cubic-bezier(0, 0, 0.2, 1);');
  });

  it('compiles a token-named motion class to a real rule, reduced-motion block intact', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    // The class became a real compiled rule.
    expect(css, 'motion-modal-in rule missing').toContain('.motion-modal-in');
    expect(css).toContain('.motion-hover');
    // The nested @media survived compile + minify -- the blueprint-risk-#1 shape.
    expect(css, 'reduced-motion block dropped').toContain('prefers-reduced-motion');
    // The referenced duration theme var resolved into the sheet (Tailwind minifies
    // 350ms -> .35s), proving the class is not a dangling var() reference.
    expect(css, 'duration var tree-shaken').toMatch(/--duration-normal:\s*(350ms|\.35s)/);
  });
});
