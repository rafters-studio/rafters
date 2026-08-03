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
  'motion-modal-in motion-hover motion-expand opacity-0 data-[state=open]:opacity-100 ' +
  // One member of each of the five namespaces (#1991). `ease-standard` is the
  // interesting one: `ease-*` IS a Tailwind v4 theme namespace, so this is the
  // only case where our generated block meets a built-in of the same name.
  'duration-fast ease-standard delay-hover-intent extent-pop period-spin';

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
    // The referenced theme vars bridge onto the namespace leaves (#1991), and the
    // leaves carry the perceptual value and the named curve. A literal on the
    // bridge would be a second copy of the value that could drift from the leaf.
    expect(css).toContain('--duration-normal: var(--rafters-duration-normal);');
    expect(css).toContain('--rafters-duration-normal: 350ms;');
    expect(css).toContain('--ease-enter: var(--rafters-ease-enter);');
    expect(css).toContain('--rafters-ease-enter: cubic-bezier(0, 0, 0.2, 1);');
  });

  it('compiles a token-named motion class to a real rule, reduced-motion block intact', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    // The class became a real compiled rule.
    expect(css, 'motion-modal-in rule missing').toContain('.motion-modal-in');
    expect(css).toContain('.motion-hover');
    // The nested @media survived compile + minify -- the blueprint-risk-#1 shape.
    expect(css, 'reduced-motion block dropped').toContain('prefers-reduced-motion');
    // The referenced duration theme var resolved into the sheet, proving the
    // class is not a dangling var() reference.
    expect(css, 'duration bridge tree-shaken').toMatch(
      /--duration-normal:\s*var\(--rafters-duration-normal\)/,
    );
  });

  it('every motion var in the COMPILED sheet is declared -- BOTH hops', async () => {
    // Reflection 019fb063, promoted to a test. A var() reference to a custom
    // property Tailwind dropped compiles cleanly and resolves to NOTHING. It is
    // invisible in the emitted sheet and invisible in a "does the sheet contain
    // both lines" assertion -- only reference-AND-declaration, both read off the
    // COMPILED output, catches it.
    //
    // #1991 added a HOP. `motion-modal-in` now reads
    // var(--duration-normal) -> var(--rafters-duration-normal) -> 350ms, and
    // 019fb063 only ever measured a single hop surviving Tailwind. Checking the
    // tail alone would pass on a chain whose middle was dropped, so both hops
    // are covered here.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });

    // The prefixes this change touches. `--motion-duration-*` / `--motion-easing-*`
    // are deliberately NOT here: `--motion-animation-*` and `--animate-*` have
    // referenced them since before this work while the theme block skips them, so
    // they are undeclared today. That is a real pre-existing defect (every
    // animate-* utility ships with no duration and no timing function) and it is
    // filed rather than fixed here -- widening this check to cover it would make
    // a #1991 test fail for a defect #1991 did not introduce.
    const CHECKED = /^--(duration|ease|rafters-(duration|ease|delay|extent|period))-/;

    const referenced = new Set<string>();
    for (const match of css.matchAll(/var\((--[a-z][a-z0-9-]*)\)/g)) {
      const name = match[1];
      if (name && CHECKED.test(name)) referenced.add(name);
    }
    expect(
      referenced.size,
      'no motion var references at all -- the layer vanished',
    ).toBeGreaterThan(0);
    // Both ends of the bridge must actually be among the references.
    expect(referenced).toContain('--duration-normal');
    expect(referenced).toContain('--rafters-duration-normal');

    const undeclared = [...referenced].filter((name) => !css.includes(`${name}:`));
    expect(undeclared, 'referenced but never declared -- resolves to nothing').toEqual([]);
  });

  it('compiles a real rule for a member of each of the five namespaces', async () => {
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    for (const [className, declaration] of [
      ['.duration-fast', 'var(--rafters-duration-fast)'],
      ['.ease-standard', 'var(--rafters-ease-standard)'],
      ['.delay-hover-intent', 'var(--rafters-delay-hover-intent)'],
      ['.extent-pop', 'var(--rafters-extent-pop)'],
      ['.period-spin', 'var(--rafters-period-spin)'],
    ] as const) {
      expect(css, `${className} did not compile to a rule`).toContain(className);
      expect(css, `${className} lost its var reference`).toContain(declaration);
    }
  });

  it('the hand-authored ease declaration wins the merged rule', async () => {
    // ease-* is the ONE namespace Tailwind v4 also theme-infers a utility for
    // (from the --ease-* bridge), so the compiled sheet merges Tailwind's
    // inferred declaration with ours into a single .ease-<member> rule. The
    // computed value is only correct because OUR declaration comes last. This
    // pins that ordering: if it ever flips, the bridge's declaration would win
    // and a retune of the leaf alone could stop reaching consumers -- the
    // review round's finding, promoted to a loud failure.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    const rules = css.match(/\.ease-standard\s*\{[^}]*\}/g) ?? [];
    expect(rules.length, '.ease-standard rule missing from compiled sheet').toBeGreaterThan(0);
    const declarations = rules
      .join(';')
      .split(/[;{}]/)
      .map((d) => d.trim())
      .filter((d) => d.startsWith('transition-timing-function:'));
    expect(declarations.length).toBeGreaterThan(0);
    expect(
      declarations[declarations.length - 1],
      'the last transition-timing-function must reference the leaf, not the bridge',
    ).toBe('transition-timing-function:var(--rafters-ease-standard)');
  });
});
