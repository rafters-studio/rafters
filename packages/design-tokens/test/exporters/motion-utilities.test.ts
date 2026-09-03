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
import { DEFAULT_MOTION_CELL_ANIMATIONS } from '../../src/generators/defaults.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  registryToTailwind,
  registryToTailwindStatic,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

/**
 * Every cell name the generator assigns, in one place, DERIVED.
 *
 * A hand-typed list here was the review finding: the fixture named a dozen of
 * the cells, so the per-cell assertions below read a dozen compiled rules and
 * silently covered nothing for the rest. A cell absent from the fixture emits no
 * candidate, compiles to no rule, and every `toContain` written about it passes
 * on an empty string. Deriving the membership means a cell added to
 * `DEFAULT_MOTION_CELL_ANIMATIONS` is under these assertions the moment it
 * lands, with no edit here -- which is the property the ACs actually claim.
 *
 * Only MEMBERSHIP is derived. The expectation tables (`CELLS`, `PERIOD_CELLS`)
 * stay hand-transcribed off `motion.jsonl`, because reading the keyframe, tier
 * and curve out of the same record that drives the exporter would make those
 * assertions compare the emission to itself.
 */
const CELL_NAMES = Object.keys(DEFAULT_MOTION_CELL_ANIMATIONS);

/** The bare `animate-<cell>` candidate for every one of them. */
const CELL_CLASSES = CELL_NAMES.map((cell) => `animate-${cell}`).join(' ');

// motion-modal-in carries a reduced-motion override (opacity, 150ms); motion-hover
// is preserved unchanged (no @media block). Both exercised as literal classes.
const FIXTURE_CLASSES =
  'motion-modal-in motion-hover motion-expand opacity-0 data-[state=open]:opacity-100 ' +
  // One member of each of the five namespaces (#1991). `ease-standard` is the
  // interesting one: `ease-*` IS a Tailwind v4 theme namespace, so this is the
  // only case where our generated block meets a built-in of the same name.
  'duration-fast ease-standard delay-hover-intent extent-pop period-spin ' +
  // An animate-* utility, so the dangling-var sweep below actually has an
  // `--animate-*` reference to sweep. Without a literal candidate in the
  // content, Tailwind emits no rule and widening the check would cover nothing.
  // scale-out is the presence exit keyframe (#1996), which is the animation the
  // #2000 bug silently zeroed.
  'animate-scale-out ' +
  // The per-cell animation composites (#2017 / #2154). BOTH candidate forms: the
  // bare class for EVERY assigned cell, derived above so no cell can drop out of
  // the compiled sheet by omission, and the data-state variant the three classes
  // files actually type, because a bare candidate alone would not prove a
  // variant can wrap a utility whose body contains a nested @media.
  `${CELL_CLASSES} ` +
  'data-[state=open]:animate-dialog-content-open ' +
  'data-[state=closed]:animate-dialog-content-close ' +
  'data-[state=open]:animate-popover-content-open ' +
  'data-[state=closed]:animate-popover-content-close ' +
  'data-[state=open]:animate-dropdown-menu-content-open ' +
  'data-[state=closed]:animate-dropdown-menu-content-close';

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
    expect(css).toContain('transition-duration: var(--rafters-duration-normal);');
    expect(css).toContain('transition-timing-function: var(--rafters-ease-enter);');
    // Nested reduced-motion override, longhand re-set.
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {');
    // Preserved-feedback token has no reduced-motion block.
    expect(css).toContain('@utility motion-hover {');
    // expand/collapse transition grid-template-rows, never height.
    expect(css).toContain('transition-property: grid-template-rows, opacity;');
    expect(css).not.toContain('transition-property: height');
    // These read the LEAF. The bridge keys exist to make Tailwind generate its
    // own utilities and are not a naming layer for us to read through -- and the
    // leaf is the only spelling the reduced-motion law reaches, since the law is
    // written on the values rather than on each utility.
    expect(css).toContain('--rafters-duration-normal: 350ms;');
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
    // Matched loosely on the value: this is the COMPILED sheet, and the minifier
    // rewrites `350ms` as `.35s`. Pinning the authored spelling would fail on a
    // formatting change rather than on the dangling reference this test catches.
    expect(css, 'duration leaf tree-shaken').toMatch(/--rafters-duration-normal:\s*(350ms|\.35s)/);
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

    // Every motion prefix, the animation chain INCLUDED. It used to stop short:
    // `--motion-duration-*` / `--motion-easing-*` were carved out because
    // `--animate-*` referenced them while nothing declared them, so every
    // animate-* utility shipped with no duration and no timing function --
    // `animation: scale-out  ;`, which parses, computes to a zero duration, and
    // silently never runs. That was #2000, and this PR fixes it at the source
    // (motion.ts now builds the animation value on the declared namespace leaves
    // `--rafters-duration-*` / `--rafters-ease-*`). The carve-out described a
    // defect that no longer exists, so it is gone and the prefixes are in the
    // sweep: reintroducing the `--motion-duration-*` reference now fails here.
    const CHECKED =
      /^--(duration|ease|animate|motion-(duration|easing|animation)|rafters-(duration|ease|delay|extent|period|animate))-/;

    const referenced = new Set<string>();
    for (const match of css.matchAll(/var\((--[a-z][a-z0-9-]*)\)/g)) {
      const name = match[1];
      if (name && CHECKED.test(name)) referenced.add(name);
    }
    expect(
      referenced.size,
      'no motion var references at all -- the layer vanished',
    ).toBeGreaterThan(0);
    // The leaf must be among the references. The bridge key is Tailwind's to
    // read, not ours, so there is no second end for us to check here.
    expect(referenced).toContain('--rafters-duration-normal');
    // And the animation chain is genuinely in the sweep, not silently empty:
    // .animate-scale-out -> var(--animate-scale-out) -> the animation shorthand,
    // whose duration and easing are themselves var()s that must resolve.
    // A curve leaf as well as a duration leaf -- an assignment key is made of
    // both, and both have to resolve. Named against what the fixture reaches:
    // the compiled sheet carries only the leaves its classes pull in.
    expect(referenced).toContain('--rafters-ease-enter');

    const undeclared = [...referenced].filter((name) => !css.includes(`${name}:`));
    expect(undeclared, 'referenced but never declared -- resolves to nothing').toEqual([]);
  });

  it('the STATIC Studio sheet has no dangling motion var either', () => {
    // Same class of bug as the compiled sweep above, second emission path. The
    // static sheet is the one Studio writes to disk, and it had its own copy:
    // `--animate-X: var(--rafters-animate-X)`, a namespace no token is named
    // for and no exporter declares, in this sheet or the runtime one. Every
    // animate-* utility in Studio therefore resolved to nothing.
    //
    // The sweep is SCOPED to the motion namespaces on purpose. The static
    // sheet's other bridges (`--color-*: var(--rafters-color-*)`) legitimately
    // point at leaves declared in the separate runtime :root file, so a blanket
    // same-sheet check would false-positive on all of them. The motion leaves
    // are different: generateMotionNamespaceVars writes them into THIS sheet,
    // so for these prefixes same-sheet declaration is the actual contract.
    const css = registryToTailwindStatic(baseRegistry());
    const MOTION_LEAF = /^--rafters-(duration|ease|delay|extent|period|animate)-/;

    const referenced = new Set<string>();
    for (const match of css.matchAll(/var\((--[a-z][a-z0-9-]*)\)/g)) {
      const name = match[1];
      if (name && MOTION_LEAF.test(name)) referenced.add(name);
    }
    expect(
      referenced.size,
      'no motion leaf references at all -- the layer vanished',
    ).toBeGreaterThan(0);

    const undeclared = [...referenced].filter((name) => !css.includes(`${name}:`));
    expect(undeclared, 'referenced but never declared in the static sheet').toEqual([]);

    // The assignments are present and built from leaves -- no invented
    // `--rafters-animate-*` namespace, and no literal times.
    expect(css).not.toContain('--rafters-animate-');
    expect(css).toMatch(
      /--animate-scale-out-moderate-exit:\s*scale-out var\(--rafters-duration-moderate\)/,
    );

    // The matrix's assignments reach this sheet too. They ARE in the `--animate-*`
    // theme namespace now -- the old note here said they were deliberately kept
    // out of it, because a theme-inferred rule sets the animation shorthand and
    // would reset a per-utility reduced-motion zero. That reasoning lapsed when
    // the zero moved to the leaf: the shorthand's duration IS the leaf, so it
    // zeroes with it and there is nothing left for the shorthand to reset.
    expect(css, 'the assignments are missing from the static sheet').toContain(
      '--animate-scale-in-normal-enter: scale-in var(--rafters-duration-normal)',
    );
    // And the cell tokens do not also emit a bridge onto a leaf nothing
    // declares -- they are JSON specs, not custom properties.
    expect(css).not.toContain('--motion-cell-');
  });

  it('the two emission paths emit BYTE-IDENTICAL assignments', () => {
    // The toy-9 invariant, applied to the cells: the blocks contain references
    // and no values, so there is nothing for the two paths to disagree about.
    // A difference here means one path started resolving something.
    const blocks = (css: string) =>
      (css.match(/@utility animate-[a-z-]+ \{[\s\S]*?\n\}/g) ?? []).join('\n');
    expect(blocks(registryToTailwindStatic(baseRegistry()))).toBe(
      blocks(registryToTailwind(baseRegistry())),
    );
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

  it('every motion class compiles to exactly ONE rule -- one generator per class', async () => {
    // REPLACES "the hand-authored ease declaration wins the merged rule". That
    // test existed because we emitted an @utility ease-standard block AND a
    // --ease-* theme key, so Tailwind generated a second rule with the same
    // selector and merged the two -- with its declaration landing LAST, meaning
    // the computed value came from the theme key. The old test could only PIN
    // that ordering; it could not stop it flipping, and merely adding a second
    // property to our block was enough to flip it.
    //
    // The duplicate is gone rather than ordered: duration, ease and delay have
    // exactly one generator (Tailwind, from the bridge keys), and extent and
    // period have exactly one (us, because Tailwind has no namespace for them).
    // Two rules for one class is now the failure, not the thing to arrange.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    for (const className of ['duration-fast', 'ease-standard', 'delay-hover-intent']) {
      const rules = css.match(new RegExp(`\\.${className}\\s*\\{[^}]*\\}`, 'g')) ?? [];
      expect(rules.length, `.${className} should compile to exactly one rule`).toBe(1);
    }
  });

  // ==========================================================================
  // MOTION ASSIGNMENTS -- matrix conformance, asserted at the COMPILED layer.
  //
  // 019fc544: a generator-text proof does not transfer. Everything below is read
  // out of `registryToCompiled` output, after real Tailwind compilation and
  // minification, because that is the artifact a browser reads.
  //
  // WHAT CHANGED FROM #2017's SHAPE. These used to assert one hand-written
  // `@utility animate-<component>-<part>-<transition>` block per cell. The
  // assignments are now `--animate-*` theme keys, deduplicated by the motion
  // itself -- (shape, tier, curve) -- and Tailwind generates the utility. The
  // guarantees under test are the same ones: the assignment reaches the sheet,
  // it is built from leaves and never from literals, a loop runs forever and is
  // exempt from the zero, a transition runs once, and a retune moves every
  // consumer without touching any of them.
  // ==========================================================================

  /** Distinct assignments the matrix makes, as (shape, tier, curve). */
  const ASSIGNMENTS = [
    ['scale-in', 'normal', 'enter'],
    ['scale-out', 'moderate', 'exit'],
    ['scale-in', 'moderate', 'enter'],
    ['scale-out', 'fast', 'exit'],
    ['fade-in', 'normal', 'enter'],
    ['fade-out', 'moderate', 'exit'],
  ] as const;

  /** Loops, as (shape, period). */
  const LOOPS = [
    ['pulse', 'shimmer'],
    ['spin', 'spin'],
    ['caret-blink', 'blink'],
  ] as const;

  it('every distinct assignment reaches the sheet on its own leaves', () => {
    // The #2012 defect, stated as a test: distinct assignments were collapsed
    // into one baked animation at normal + spring-snappy. Each pairing gets its
    // own key, built from the tier and curve the row names -- and spring-snappy
    // appears in none of them, because it is press feedback and never an
    // entrance.
    const css = registryToTailwind(baseRegistry());
    for (const [shape, tier, curve] of ASSIGNMENTS) {
      expect(css, `${shape}/${tier}/${curve} missing`).toContain(
        `--animate-${shape}-${tier}-${curve}: ${shape} ` +
          `var(--rafters-duration-${tier}) var(--rafters-ease-${curve});`,
      );
    }
    const assignmentLines = css.split('\n').filter((l) => l.includes('--animate-'));
    expect(
      assignmentLines.filter((l) => l.includes('spring-snappy')),
      'spring-snappy is press feedback -- no entrance may name it',
    ).toEqual([]);
  });

  it('ONE key per motion, not one per moment', () => {
    // dialog/content/open and alert-dialog/content/open are both scale-in at
    // normal on enter. That is ONE motion, and two names for it is the drift the
    // generics ruling exists to prevent -- one fast, everywhere, always. A
    // component that should differ differs by TIER, which is already in the name.
    const css = registryToTailwind(baseRegistry());
    const names = [...css.matchAll(/--animate-([a-z0-9-]+):/g)].map((m) => m[1]);
    expect(names.length, 'no assignments emitted at all').toBeGreaterThan(0);
    expect(new Set(names).size, 'a name is emitted twice').toBe(names.length);
    // Nothing is keyed by a component any more.
    for (const componentName of ['dialog', 'popover', 'dropdown-menu', 'sheet', 'tooltip']) {
      expect(
        names.filter((n) => n?.startsWith(`${componentName}-`)),
        `${componentName} is a name`,
      ).toEqual([]);
    }
  });

  it('no assignment carries a value -- references only', () => {
    // The toy-9 invariant at the key layer: a literal here is a second copy of a
    // value that can drift from the leaf, and it escapes the reduced-motion law,
    // which is written on the leaves.
    const css = registryToTailwind(baseRegistry());
    for (const line of css.split('\n').filter((l) => l.includes('--animate-'))) {
      expect(line, `a duration literal: ${line.trim()}`).not.toMatch(/\d+m?s\b/);
      expect(line, `a curve literal: ${line.trim()}`).not.toMatch(/cubic-bezier|steps\(/);
    }
  });

  it('a loop runs forever on its period leaf, and a transition runs once', () => {
    const css = registryToTailwind(baseRegistry());
    for (const [shape, period] of LOOPS) {
      expect(css, `${shape} loop missing`).toContain(
        `--animate-${shape}-${period}: ${shape} var(--rafters-period-${period}) infinite;`,
      );
    }
    // A tier-kind assignment writes no iteration count: the CSS initial value is
    // already 1, and a literal standing where its absence says the same thing is
    // a value nobody chose.
    for (const [shape, tier, curve] of ASSIGNMENTS) {
      const line =
        css.split('\n').find((l) => l.includes(`--animate-${shape}-${tier}-${curve}:`)) ?? '';
      expect(line, `${shape}/${tier}/${curve} names an iteration count`).not.toContain('infinite');
    }
  });

  it('the reduced-motion law reaches every animation, and no loop', () => {
    // MECHANISM B, moved to the leaf. Zeroing `animation-duration` rather than
    // setting `animation: none` keeps the end state: the animation still runs
    // and still completes, instantly. And because the zero is on the LEAF, it
    // reaches an --animate-* key without that key carrying a single line about
    // reduced motion -- the key's duration IS the leaf.
    const css = registryToTailwind(baseRegistry());
    const start = css.indexOf('@media (prefers-reduced-motion: reduce) {\n  :root {');
    expect(start, 'no leaf-level reduced-motion block').toBeGreaterThan(-1);
    const law = css.slice(start, css.indexOf('\n}', css.indexOf('  }', start)));
    for (const [, tier] of ASSIGNMENTS) {
      expect(law, `${tier} is not zeroed`).toContain(`--rafters-duration-${tier}: 0ms;`);
    }
    // Loops slow, they never stop -- a stopped spinner says the work stopped.
    for (const [, period] of LOOPS) {
      expect(law, `period ${period} was zeroed`).not.toContain(`--rafters-period-${period}`);
    }
    // MECHANISM A IS NOWHERE NEAR THIS. `animation: none` resets the shorthand
    // and discards the zeroed duration with it, so the two must never both apply.
    expect(css).not.toContain('animation: none');
  });

  it('an operator PIN stays keyed by its own name', async () => {
    // A pin is one specific moment by definition -- the operator hand-tuned THAT
    // cell -- so it is not deduplicated into a shared motion, and its verbatim
    // shorthand is emitted as its own key.
    const registry = baseRegistry();
    registry.set('motion-cell-dialog-content-open', 'scale-in 400ms linear', {
      reason: 'test: an operator hand-tunes one moment',
      kind: 'preference',
    });
    const css = registryToTailwind(registry);
    expect(css).toContain('--animate-dialog-content-open: scale-in 400ms linear;');
  });

  it('a cell the exporter cannot represent fails the export, loudly', () => {
    // Emitting a broken key would be a rule that compiles and animates nothing;
    // skipping the cell would delete the animation with no error at all. Both are
    // the 019fb063 silent-resolution failure arriving from inside our own emission.
    const registry = baseRegistry();
    registry.set('motion-cell-dialog-content-open', '{"keyframe":"scale-in"}', {
      reason: 'test: a cell with no duration',
      kind: 'preference',
    });
    expect(() => registryToTailwind(registry)).toThrow(/duration\.kind/);
  });

  it('a leaf retune moves every consumer, and the keys do not move at all', () => {
    // The governing property: change, override and cascade ARE the system. Both
    // anchored popups sit on `moderate`; retuning that one leaf reaches both
    // without either assignment being touched, and the emitted keys are
    // byte-identical because they are references.
    const before = registryToTailwind(baseRegistry());
    const registry = baseRegistry();
    registry.set('rafters-duration-moderate', '275ms', {
      reason: 'test: a designer retunes one leaf',
      kind: 'preference',
    });
    const after = registryToTailwind(registry);

    const keys = (css: string) =>
      css
        .split('\n')
        .filter((l) => l.includes('--animate-'))
        .join('\n');
    expect(keys(before), 'the assignments are not value-free').toBe(keys(after));
    expect(before).toContain('--rafters-duration-moderate: 250ms;');
    expect(after).toContain('--rafters-duration-moderate: 275ms;');
  });
});
