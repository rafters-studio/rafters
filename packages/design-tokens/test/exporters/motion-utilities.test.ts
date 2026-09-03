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
import type { Token } from '@rafters/shared';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';
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

/** The base token list with ONE cell token's value replaced, for the failure paths. */
function tokensWithCellValue(name: string, value: string): Token[] {
  let found = false;
  const tokens = generateBaseSystem({}).allTokens.map((token) => {
    if (token.name !== name) return token;
    found = true;
    return { ...token, value };
  });
  if (!found) throw new Error(`no token named "${name}"`);
  return tokens;
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
    expect(referenced).toContain('--animate-scale-out');

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

    // And the animation entries carry the value rather than the invented bridge.
    expect(css).not.toContain('--rafters-animate-');
    expect(css).toMatch(/--animate-scale-out:\s*scale-out /);

    // The motion CELLS reach this sheet too (#2017). They are NOT in the
    // `--animate-*` theme namespace -- on purpose, since a theme-inferred rule
    // sets the animation shorthand and would reset the reduced-motion zero --
    // so they arrive only if the static path emits the @utility blocks itself.
    // Without this the three consuming components would animate in the dynamic
    // sheet and compile to nothing in Studio's.
    expect(css, 'the motion cells are missing from the static sheet').toContain(
      '@utility animate-dialog-content-open {',
    );
    expect(css).toContain('animation-duration: var(--rafters-duration-normal);');
    // And the cell tokens do not also emit a bridge onto a leaf nothing
    // declares -- they are JSON specs, not custom properties.
    expect(css).not.toContain('--motion-cell-');
  });

  it('the two emission paths emit BYTE-IDENTICAL cell utilities', () => {
    // The toy-9 invariant, applied to the cells: the blocks contain references
    // and no values, so there is nothing for the two paths to disagree about.
    // A difference here means one path started resolving something.
    const blocks = (css: string) =>
      (css.match(/@utility animate-[a-z-]+ \{[\s\S]*?\n\}/g) ?? []).join('\n');
    expect(blocks(registryToTailwindStatic(baseRegistry()))).toBe(
      blocks(registryToTailwind(baseRegistry())),
    );
  });

  it('a PINNED cell still emits a utility, and the reduced-motion law still reaches it', () => {
    // `registry.set` on a cell is the sanctioned hand-tune (toy 13 measures it,
    // and an explicit registry.bind() is the one exit that clears the pin). The
    // pinned value is an animation shorthand rather than the JSON spec, and the
    // exporter must not treat that as garbage: skipping the token would DELETE
    // the utility, so the component would silently stop animating with nothing
    // logged -- and dropping the media block would take a hand-tuned cell out
    // of the reduced-motion law. The governing diagnostic is that the registry
    // can still override this node; a silent deletion is not an override.
    const registry = baseRegistry();
    registry.set('motion-cell-dialog-content-open', 'scale-in 250ms cubic-bezier(0.2, 0, 0, 1)', {
      reason: 'test: operator hand-tunes one cell',
      kind: 'preference',
    });
    const css = registryToTailwind(registry);

    expect(css, 'the pin deleted the utility').toContain('@utility animate-dialog-content-open {');
    expect(css).toContain('animation: scale-in 250ms cubic-bezier(0.2, 0, 0, 1);');
    // The law still applies, and it lands AFTER the shorthand so it wins on the
    // duration and only on the duration -- which is what mechanism B is.
    const block = /@utility animate-dialog-content-open \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(block.indexOf('prefers-reduced-motion')).toBeGreaterThan(block.indexOf('animation:'));
    expect(block).toContain('animation-duration: 0s;');
    // Its unpinned siblings are untouched -- a pin is one cell, not a mode.
    expect(css).toContain('animation-duration: var(--rafters-duration-moderate);');
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
  // MOTION CELLS (#2017) -- matrix conformance, asserted at the COMPILED layer.
  //
  // 019fc544: a generator-text proof does not transfer. Everything below is read
  // out of `registryToCompiled` output, after real Tailwind compilation and
  // minification, because that is the artifact a browser reads.
  // ==========================================================================

  /** Every cell, with the assignment its motion.jsonl row declares. */
  const CELLS = [
    ['dialog-content-open', 'scale-in', 'normal', 'enter'],
    ['dialog-content-close', 'scale-out', 'moderate', 'exit'],
    ['popover-content-open', 'scale-in', 'moderate', 'enter'],
    ['popover-content-close', 'scale-out', 'fast', 'exit'],
    ['dropdown-menu-content-open', 'scale-in', 'moderate', 'enter'],
    ['dropdown-menu-content-close', 'scale-out', 'fast', 'exit'],
  ] as const;

  it('each animated matrix cell compiles to its OWN rule with its OWN tier and curve', async () => {
    // The #2012 defect, stated as a test: three distinct cells were collapsed
    // into one baked animation at normal + spring-snappy. Six cells, six rules,
    // six assignments read off the matrix -- and spring-snappy appears in none
    // of them, because it is press/friendly feedback and never an entrance.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });

    for (const [cell, keyframe, tier, curve] of CELLS) {
      // The BASE rule only -- the leading `.` excludes the escaped
      // `.data-\[state\=open\]\:animate-<cell>` variants, and the reduced-motion
      // @media, which legitimately repeats the same selector, is filtered out.
      //
      // EXACTLY ONE, and read through `baseRuleFor` so a MERGED selector list
      // counts. lightningcss folds rules with identical bodies together, and
      // several of these cells share `scale-in / moderate / enter` -- a matcher
      // that demanded `.animate-<cell>{` would read that merge as a missing rule
      // and fail on correct emission the day the fixture gains one more class.
      const body = baseRuleFor(css, cell);
      // Longhand, never the shorthand: only longhand lets the nested media
      // query re-set one property, and a shorthand anywhere would reset it.
      expect(body, `${cell} emitted the animation shorthand`).not.toMatch(/[^-]animation:/);
      expect(body, `${cell} lost its keyframe`).toContain(`animation-name:${keyframe}`);
      expect(body, `${cell} is not on its assigned tier`).toContain(
        `animation-duration:var(--rafters-duration-${tier})`,
      );
      expect(body, `${cell} is not on its assigned curve`).toContain(
        `animation-timing-function:var(--rafters-ease-${curve})`,
      );
      // No second value anywhere: references only, never a literal.
      expect(body, `${cell} carries a duration literal`).not.toMatch(/\d+m?s\b/);
      expect(body, `${cell} carries a curve literal`).not.toMatch(/cubic-bezier|steps\(/);
    }

    expect(css, 'spring-snappy is press-only -- no entrance may name it').not.toContain(
      'animation-timing-function:var(--rafters-ease-spring-snappy)',
    );
  });

  it('keyframe geometry is the extent LEAF, and it resolves in the same sheet', async () => {
    // Keyframes are SHAPES: the entrance scale is `extent-pop`, referenced by
    // name, not the `1/ratio^0.25` formula #2012 shipped while extent-pop had
    // no consumer at all. Both scale keyframes, and the leaf declared here too
    // -- a var() onto an undeclared property compiles clean and animates to
    // nothing (019fb063).
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });

    for (const keyframe of ['scale-in', 'scale-out']) {
      const block = new RegExp(`@keyframes ${keyframe}\\{[^@]*?\\}\\}`).exec(css)?.[0];
      expect(block, `@keyframes ${keyframe} missing from the compiled sheet`).toBeDefined();
      expect(block, `${keyframe} lost the extent reference`).toContain(
        'scale(var(--rafters-extent-pop))',
      );
      // The formula's output, pinned so a reintroduction fails loudly.
      expect(block, `${keyframe} still carries a derived literal`).not.toContain('scale(0.9');
    }
    expect(css, 'the extent leaf is undeclared -- the keyframe scales to nothing').toMatch(
      /--rafters-extent-pop:\s*\.?0?\.95/,
    );
  });

  it('reduced motion is mechanism B, and mechanism A is nowhere near it', async () => {
    // B: zero animation-duration in the emission. It preserves the keyframe's
    // end state, which A (`animation: none`) never reaches -- A removes the
    // animation rather than completing it instantly. A also, wherever it wins,
    // resets the shorthand and discards B with it, so the two must never both
    // apply to a cell. Presence's release path does not separate them: under
    // reduced motion neither leaves anything in `getAnimations()`.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });

    const reducedBlocks =
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? [];
    const reduced = reducedBlocks.join('');
    for (const [cell] of CELLS) {
      // Substring, not a full selector: the variant forms compile with escaped
      // selectors and both they and the bare rule must carry the zero.
      expect(reduced, `${cell} has no reduced-motion path`).toContain(`animate-${cell}`);
    }
    expect(reduced, 'mechanism B did not compile -- the duration is not zeroed').toContain(
      'animation-duration:0s',
    );
    // Mechanism A must not touch a CELL. Scoped to the cell rules on purpose --
    // `animation:none` is legitimately elsewhere in a real app sheet, because
    // several loop consumers (skeleton, spinner, progress) still carry
    // motion-reduce:animate-none. A whole-sheet assertion would pass here only
    // because this fixture omits them, and would then fail for the wrong reason
    // the moment a loop entered the fixture. What must hold is narrower and
    // true: no cell rule carries A, so nothing can reset the shorthand out from
    // under B. (Those loop consumers are a separate, pre-existing violation of
    // "loops slow, they never stop" -- out of scope for a conformance fix.)
    for (const [cell] of CELLS) {
      expect(
        rulesFor(css, cell).join(''),
        `${cell} carries mechanism A and will destroy B`,
      ).not.toContain('animation:none');
    }
  });

  it('the period exemption survives -- loops slow, they never stop', async () => {
    // The property that decided the mechanism. Under B the exemption is SET
    // MEMBERSHIP (REDUCED_MOTION_ZEROED omits `period`), so the loop utility
    // simply gets no reduced-motion block. Under A it would have been one
    // cell-blind rule and the exemption would depend on an author remembering
    // not to type a class.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    const reducedBlocks =
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? [];
    expect(reducedBlocks.length, 'no reduced-motion blocks at all').toBeGreaterThan(0);
    expect(
      reducedBlocks.join(''),
      'a loop period was zeroed -- a stopped spinner says the work stopped',
    ).not.toContain('.period-spin');
  });

  // ==========================================================================
  // PERIOD-KIND CELLS (#2154). The namespace-level exemption above proves the
  // `period-*` UTILITIES are exempt. It says nothing about a CELL that consumes
  // a period, which is where the four loops actually live -- so everything
  // below asserts the exemption on the cells themselves.
  // ==========================================================================

  /** Every period-kind cell, with the period its motion.jsonl row declares. */
  const PERIOD_CELLS = [
    ['skeleton-root-waiting', 'pulse', 'shimmer'],
    ['spinner-root-busy', 'spin', 'spin'],
    ['progress-root-indeterminate', 'pulse', 'shimmer'],
    ['input-otp-caret-idle', 'caret-blink', 'blink'],
  ] as const;

  it('PERIOD_CELLS names every period-kind cell the generator assigns', () => {
    // The expectation table above is hand-transcribed on purpose, so this holds
    // it COMPLETE without making it derived. Otherwise a fifth loop would be
    // absent from the negative set below and its exemption -- the whole point of
    // #2154 -- would go unasserted while the suite stayed green.
    const assigned = Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)
      .filter(([, animation]) => animation.duration.kind === 'period')
      .map(([cell]) => cell)
      .sort();
    expect(PERIOD_CELLS.map(([cell]) => cell).toSorted()).toEqual(assigned);
  });

  /**
   * Every tier-kind cell, derived. MEMBERSHIP only -- the assignment each one
   * carries is checked against `motion.jsonl` in `motion-cells.test.ts`, not
   * here, so nothing below compares the emission to the record that produced it.
   *
   * This was the list that had to be edited by hand for a new cell to be
   * covered, which meant it never was: the ten cells added in this issue's fix
   * round were absent from it and from the fixture, so the two assertions that
   * cite it read nothing about them at all.
   */
  const TIER_CELLS = Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)
    .filter(([, animation]) => animation.duration.kind === 'tier')
    .map(([cell]) => cell);

  it('there are tier-kind cells to assert on at all', () => {
    // A derived list that silently emptied would make every loop below a no-op,
    // which is the failure this whole change is about.
    expect(TIER_CELLS.length).toBeGreaterThan(PERIOD_CELLS.length);
    expect(TIER_CELLS.length + PERIOD_CELLS.length).toBe(CELL_NAMES.length);
  });

  /**
   * Every compiled rule whose SELECTOR LIST carries `.animate-<cell>`.
   *
   * A selector list, not a lone selector: lightningcss merges rules with
   * identical bodies, and two cells with the same shape, tier and curve
   * legitimately land in one `.animate-a,.animate-b{...}`. Matching only
   * `.animate-<cell>{` would read that merge as a MISSING rule -- which is a
   * test that fails when the emission is correct.
   */
  function rulesFor(css: string, cell: string): string[] {
    const needle = `.animate-${cell}`;
    const found: string[] = [];
    for (let at = css.indexOf(needle); at !== -1; at = css.indexOf(needle, at + 1)) {
      const after = css[at + needle.length];
      // A selector ends at `{` (last in the list) or `,` (more to come). Anything
      // else is a longer class name that merely starts the same way.
      if (after !== '{' && after !== ',') continue;
      let start = at;
      while (start > 0 && css[start - 1] !== '{' && css[start - 1] !== '}') start--;
      const open = css.indexOf('{', at);
      const close = css.indexOf('}', open);
      if (open === -1 || close === -1) continue;
      found.push(css.slice(start, close + 1));
    }
    return found;
  }

  function baseRuleFor(css: string, cell: string): string {
    // EXACTLY ONE base rule. A second would mean Tailwind theme-inferred a
    // competing `.animate-<cell>` that sets the animation SHORTHAND, which
    // resets animation-duration and would discard the reduced-motion zero.
    const base = rulesFor(css, cell).filter((r) => !r.includes('animation-duration:0s'));
    expect(base.length, `.animate-${cell} did not compile to exactly one base rule`).toBe(1);
    return base.join('');
  }

  it('a period-kind cell compiles to an infinite loop on its period leaf', async () => {
    // The gap this closes: a looping cell had no representable duration form, so
    // skeleton, spinner, progress-indeterminate and the OTP caret had no CSS at
    // all. The period is a reference like every other value in a cell body.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });

    for (const [cell, keyframe, period] of PERIOD_CELLS) {
      const body = baseRuleFor(css, cell);
      expect(body, `${cell} lost its keyframe`).toContain(`animation-name:${keyframe}`);
      expect(body, `${cell} is not on its assigned period`).toContain(
        `animation-duration:var(--rafters-period-${period})`,
      );
      expect(body, `${cell} does not repeat -- a loop that runs once is not a loop`).toContain(
        'animation-iteration-count:infinite',
      );
      // No curve: every period row declares curve "none", so naming one would be
      // an assignment no cell made.
      expect(body, `${cell} invented a curve`).not.toContain('animation-timing-function');
      // References only, never a literal -- the same law the tier cells obey.
      expect(body, `${cell} carries a period literal`).not.toMatch(/\d+m?s\b/);
    }

    // And the leaves the loops point at are declared in the same sheet, or the
    // var() resolves to nothing and the loop stands still (019fb063).
    expect(css).toMatch(/--rafters-period-shimmer:\s*2s/);
    expect(css).toMatch(/--rafters-period-spin:\s*1s/);
    expect(css).toMatch(/--rafters-period-blink:\s*1\.25s/);
  });

  it('a tier-kind cell writes no iteration count -- a transition runs once', async () => {
    // The CSS initial value is already 1. Writing it would be a literal standing
    // where its absence says the same thing, and it would blur the one
    // distinction the two duration forms exist to keep.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    for (const cell of TIER_CELLS) {
      expect(baseRuleFor(css, cell), `${cell} declared an iteration count`).not.toContain(
        'animation-iteration-count',
      );
    }
  });

  it('reduced motion zeroes every tier-kind cell and no period-kind cell', async () => {
    // The acceptance criterion, at the compiled layer and per cell. Mechanism B
    // zeroes the duration so the keyframe still reaches its end state and still
    // fires `animationend` -- which is what presence releases the unmount on --
    // while a loop is exempt by law, because a stopped spinner says the work
    // stopped.
    const css = await registryToCompiled(baseRegistry(), { contentSources: [fixtureDir] });
    const reduced = (
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? []
    ).join('');

    for (const cell of TIER_CELLS) {
      expect(reduced, `${cell} has no reduced-motion path`).toContain(`animate-${cell}`);
    }
    for (const [cell] of PERIOD_CELLS) {
      expect(reduced, `${cell} was zeroed -- loops slow, they never stop`).not.toContain(
        `animate-${cell}`,
      );
    }
    // Mechanism A must not reach a loop either: `animation:none` would stop it
    // outright, which is the same violation by another route.
    for (const [cell] of PERIOD_CELLS) {
      expect(baseRuleFor(css, cell), `${cell} carries mechanism A`).not.toContain('animation:none');
    }
  });

  it('an operator PIN on a loop keeps the exemption', async () => {
    // A pinned cell's JSON spec is replaced by a shorthand, so the exporter can
    // no longer read the duration form off the value. It reads the token's
    // `reducedMotionAware` instead, which survives the pin -- otherwise a
    // hand-tuned spinner would silently fall under the zeroing law.
    const registry = baseRegistry();
    registry.set('motion-cell-spinner-root-busy', 'spin 900ms linear infinite', {
      reason: 'test: operator hand-tunes one loop',
      kind: 'preference',
    });
    const css = registryToTailwind(registry);

    const block = /@utility animate-spinner-root-busy \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(block, 'the pin deleted the utility').toContain(
      'animation: spin 900ms linear infinite;',
    );
    expect(block, 'a pinned loop fell under the zeroing law').not.toContain(
      'prefers-reduced-motion',
    );
    // A pinned TRANSITION still gets the block -- the pin is one cell, not a mode.
    const tier = /@utility animate-dialog-content-open \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(tier).toContain('prefers-reduced-motion');
  });

  it('a cell the exporter cannot represent fails the export, loudly', () => {
    // Never a silent skip and never a silent default: a skipped token deletes
    // the utility and stops the component animating with no error, and a
    // defaulted duration lets an unrepresented cell compile as if it had a
    // value. Both are the 019fb063 failure arriving from inside our own
    // emission.
    const unknownKind = tokensWithCellValue(
      'motion-cell-spinner-root-busy',
      JSON.stringify({ keyframe: 'spin', duration: { kind: 'ratio', ratio: 1.2 } }),
    );
    expect(() => tokensToTailwind(unknownKind, { includeImport: false }, [])).toThrowError(
      /duration\.kind/,
    );

    const unknownPeriod = tokensWithCellValue(
      'motion-cell-spinner-root-busy',
      JSON.stringify({ keyframe: 'spin', duration: { kind: 'period', period: 'shimmr' } }),
    );
    expect(() => tokensToTailwind(unknownPeriod, { includeImport: false }, [])).toThrowError(
      /unknown period "shimmr"/,
    );
  });

  it('a leaf retune moves the cells that reference it, and nothing else', async () => {
    // The governing property: change, override and cascade ARE the system. Both
    // anchored popups sit on `moderate`; retuning that one leaf must reach both
    // without either cell being touched, and the emitted utility bodies must be
    // byte-identical because they are references.
    const before = registryToTailwind(baseRegistry());
    const registry = baseRegistry();
    registry.set('rafters-duration-moderate', '275ms', {
      reason: 'test: a designer retunes one leaf',
      kind: 'preference',
    });
    const after = registryToTailwind(registry);

    const cellBlocks = (css: string) =>
      (css.match(/@utility animate-[a-z-]+ \{[\s\S]*?\n\}/g) ?? []).join('\n');
    expect(cellBlocks(before), 'the cell utilities are not value-free').toBe(cellBlocks(after));
    expect(before).toContain('--rafters-duration-moderate: 250ms;');
    expect(after).toContain('--rafters-duration-moderate: 275ms;');
  });
});
