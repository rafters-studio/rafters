import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';
import type { Token } from '@rafters/shared';

/**
 * GOLDEN OUTPUT GUARD, AT THE CSS LAYER.
 *
 * `motion-golden.test.ts` snapshots the generator's TOKENS. That is one step
 * short of the artifact a browser reads: the exporter decides which name carries
 * the literal, which name carries a reference, and which @utility blocks exist.
 * Reflection 019fb063 is the reason this file exists -- a var() reference to a
 * property that was never declared compiles cleanly and resolves to nothing, and
 * that failure is invisible in the token list.
 *
 * So this snapshot is the emitted motion surface, line for line. Read the diff.
 * Never update it blind.
 */

/**
 * Lines of the emitted sheet that carry motion.
 *
 * `animation` earns its own alternative: `animate` does not match
 * `animation-name` / `animation-duration`, so the per-cell utility blocks (#2017)
 * were landing in this snapshot with their keyframe line silently filtered out
 * -- a golden that hides the very declaration under review.
 */
const MOTION_LINE =
  /(duration|ease|delay|extent|period|motion|animate|animation|keyframes|transition)/i;

function motionLines(css: string): string[] {
  return css
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => MOTION_LINE.test(l));
}

function emitCSS(tokens: Token[]): string {
  return tokensToTailwind(tokens, { includeImport: false }, []);
}

function baseTokens(): Token[] {
  return generateBaseSystem({}).allTokens;
}

/** Every `@utility` block in the sheet, as one string. */
function utilityBlocks(css: string): string {
  const blocks: string[] = [];
  const lines = css.split('\n');
  let depth = 0;
  let current: string[] | null = null;
  for (const line of lines) {
    if (current === null && line.startsWith('@utility ')) current = [];
    if (current === null) continue;
    current.push(line);
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (depth === 0) {
      blocks.push(current.join('\n'));
      current = null;
    }
  }
  return blocks.join('\n');
}

/** Retune one leaf, the way Studio does: change the value, nothing else. */
function retune(tokens: Token[], tokenName: string, value: string): Token[] {
  let found = false;
  const next = tokens.map((t) => {
    if (t.name !== tokenName) return t;
    found = true;
    return { ...t, value };
  });
  if (!found) throw new Error(`retune: no token named "${tokenName}"`);
  return next;
}

describe('motion CSS: golden emission', () => {
  it('emits a stable motion surface', () => {
    expect(motionLines(emitCSS(baseTokens()))).toMatchSnapshot();
  });

  it('emits all five namespaces as --rafters-* leaves carrying the literal', () => {
    const css = emitCSS(baseTokens());
    expect(css).toContain('--rafters-duration-moderate: 250ms;');
    expect(css).toContain('--rafters-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);');
    expect(css).toContain('--rafters-delay-hover-intent: 200ms;');
    expect(css).toContain('--rafters-extent-pop: 0.95;');
    expect(css).toContain('--rafters-period-spin: 1s;');
  });

  it('bridges onto the theme namespaces Tailwind actually reads', () => {
    // The bridge exists to make TAILWIND generate the utility, so the key has to
    // be spelled the way Tailwind's namespace is spelled -- which for two of the
    // three is not what the class is called. Measured against the real compiler:
    // `--transition-duration-*` yields `duration-*`, `--transition-delay-*`
    // yields `delay-*`, `--ease-*` yields `ease-*`. A `--duration-*` key, which
    // is what this used to write, generates nothing at all.
    //
    // The value is a reference, never a copy: retuning a leaf moves one line.
    const css = emitCSS(baseTokens());
    expect(css).toContain('--transition-duration-moderate: var(--rafters-duration-moderate);');
    expect(css).toContain('--ease-standard: var(--rafters-ease-standard);');
    expect(css).toContain('--transition-delay-linger: var(--rafters-delay-linger);');
    expect(css).not.toContain('--transition-duration-moderate: 250ms;');
  });

  it('hand-writes a utility ONLY where Tailwind has no namespace', () => {
    // ONE GENERATOR PER CLASS. duration, ease and delay come from Tailwind, via
    // the bridge keys above; writing our own block for them too produced a second
    // rule with the same selector, and for ease-* Tailwind's declaration measurably
    // landed LAST -- so the computed value came from the theme key, not from the
    // block we believed was authoritative.
    //
    // extent and period stay ours because Tailwind cannot express them: an extent
    // publishes a custom property rather than a CSS one, and a period is a loop's
    // time, which rides inside an --animate-* shorthand.
    const css = emitCSS(baseTokens());
    expect(css).toContain(
      '@utility extent-pop {\n  --rafters-consumed-extent: var(--rafters-extent-pop);',
    );
    expect(css).toContain(
      '@utility period-spin {\n  animation-duration: var(--rafters-period-spin);',
    );
    expect(css).not.toContain('@utility duration-');
    expect(css).not.toContain('@utility ease-');
    expect(css).not.toContain('@utility delay-');
  });

  it('zeroes duration and delay under reduced motion, on the LEAF, and never period', () => {
    // THE LAW IS ON THE VALUE, NOT ON THE UTILITY. A per-utility @media block only
    // covers the utilities we hand-write, so anything reaching a leaf another way
    // -- Tailwind's own generated duration-*, its `transition` shorthand, an
    // --animate-* whose duration is a var() onto the same leaf -- escaped it
    // silently while looking token-correct. Zero the value and nothing escapes.
    const css = emitCSS(baseTokens());
    const start = css.indexOf('@media (prefers-reduced-motion: reduce) {\n  :root {');
    expect(start, 'no leaf-level reduced-motion block').toBeGreaterThan(-1);
    // The block only, not the rest of the sheet after it -- otherwise the
    // "never period" assertion below reads every period leaf in the file.
    const law = css.slice(start, css.indexOf('\n}', css.indexOf('  }', start)));
    expect(law).toContain('--rafters-duration-normal: 0ms;');
    expect(law).toContain('--rafters-delay-linger: 0ms;');
    // Loops slow, never stop -- a stopped spinner says the work stopped.
    expect(law).not.toContain('--rafters-period-');
    // And no utility block writes the ZERO any more. The semantic motion-*
    // blocks still carry a reduced-motion @media, which is a different rule:
    // they re-set transition-property to drop transforms (spatial movement
    // becomes a cross-fade, per docs/MOTION.md), a substitution rather than the
    // zeroing law this test is about.
    expect(utilityBlocks(css)).not.toContain('transition-duration: 0ms;');
    expect(utilityBlocks(css)).not.toContain('transition-delay: 0ms;');
  });

  it('carries no motion-delay-* orphan tokens into the sheet', () => {
    // The ratio-stepped delay scale generated four tokens no component ever
    // referenced. Killed in #1991 rather than migrated.
    expect(emitCSS(baseTokens())).not.toContain('--motion-delay-');
  });

  it('never references a custom property the sheet does not declare', () => {
    // Reflection 019fb063, promoted from prose to an assertion. `--animate-scale-out`
    // referenced `--motion-duration-fast`, which NOTHING declares in either emission
    // path: `animation: scale-out  ;` parses, resolves to a zero duration, and the
    // animation silently never runs. That is why presence had no exit frames to hold.
    // Reference-plus-declaration, both read off the same emitted sheet. Scoped to
    // the motion surface because this is the motion golden -- the base sheet has
    // dangling `--color-neutral-*` references too, which are a separate defect and
    // a separate issue, not something to fix under a presence card.
    const css = emitCSS(baseTokens());
    const declared = new Set<string>();
    for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) {
      if (match[1]) declared.add(match[1]);
    }
    const dangling = new Set<string>();
    for (const match of css.matchAll(/var\((--[\w-]+)/g)) {
      const name = match[1];
      // Tailwind's own internals (--tw-*) are declared by Tailwind, not by us.
      if (!name || declared.has(name)) continue;
      if (!MOTION_LINE.test(name)) continue;
      dangling.add(name);
    }
    expect([...dangling].sort()).toEqual([]);
  });

  it('builds every animation on the namespace leaves', () => {
    // The assignment keys are named for the motion -- shape, tier, curve -- and
    // built entirely from leaves. The legacy `motion-animation-*` set that used
    // to be emitted alongside them carried literal times (`spin 1s`,
    // `caret-blink 1.25s`) straight into a theme key, which is a value written
    // outside the leaf layer: retuning a period moved nothing, and the two
    // copies could disagree.
    const css = emitCSS(baseTokens());
    expect(css).toContain(
      '--animate-scale-out-fast-exit: scale-out var(--rafters-duration-fast) var(--rafters-ease-exit);',
    );
    expect(css).toContain('--animate-spin-spin: spin var(--rafters-period-spin) infinite;');
    for (const line of css.split('\n').filter((l) => l.includes('--animate-'))) {
      expect(line, `an assignment carries a literal: ${line.trim()}`).not.toMatch(/\d+m?s\b/);
    }
    expect(css).not.toContain('var(--motion-duration-');
    expect(css).not.toContain('var(--motion-easing-');
  });

  it('retuning one leaf changes exactly one line, and no @utility block at all', () => {
    // TOY 9, ASSERTION Q3, promoted to a test. This is the byte-level form of
    // "one fast, everywhere, always": utilities reference names, never values,
    // so the entire utility surface is invariant under a retune and the value
    // exists in exactly one place.
    const before = emitCSS(baseTokens());
    const after = emitCSS(retune(baseTokens(), 'rafters-duration-fast', '180ms'));

    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    expect(afterLines.length).toBe(beforeLines.length);

    const changed = beforeLines
      .map((line, i) => (line === afterLines[i] ? null : { i, from: line, to: afterLines[i] }))
      .filter((d): d is NonNullable<typeof d> => d !== null);

    expect(changed.map((d) => `${d.from.trim()} -> ${d.to?.trim()}`)).toEqual([
      '--rafters-duration-fast: 150ms; -> --rafters-duration-fast: 180ms;',
    ]);
    expect(utilityBlocks(after)).toBe(utilityBlocks(before));
  });
});
