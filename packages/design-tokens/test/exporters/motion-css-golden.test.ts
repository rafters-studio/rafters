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

  it('declares each motion value under exactly one name -- no Tailwind-facing alias', () => {
    // INVERTED FROM "bridges the pre-existing names onto the leaves". The
    // `--duration-*` / `--ease-*` aliases are gone, and their absence is now the
    // assertion, for two reasons they failed at.
    //
    // `ease-*` IS a Tailwind v4 theme namespace, so declaring `--ease-standard`
    // made Tailwind infer a `.ease-standard` utility that merged with our own
    // block and landed its declaration LAST -- the computed value came from the
    // alias, so a retune of the leaf could stop reaching consumers. And the alias
    // carried no reduced-motion path, so anything reading `var(--duration-*)`
    // escaped the zeroing law silently while looking token-correct.
    //
    // One name per value. The leaf holds it; the utility applies it and carries
    // the law.
    const css = emitCSS(baseTokens());
    expect(css).toContain('--rafters-duration-moderate: 250ms;');
    expect(css).not.toMatch(/^\s*--duration-[\w-]+:/m);
    expect(css).not.toMatch(/^\s*--ease-[\w-]+:/m);
  });

  it('generates a utility for every member of every namespace', () => {
    const css = emitCSS(baseTokens());
    // Nothing here RELIES on Tailwind theme inference -- we emit every block
    // ourselves (the #1955 lesson). One caveat, matching tailwind.ts: `ease-*`
    // IS a v4 theme namespace, so Tailwind also infers its own ease utilities
    // from the --ease-* bridge; the compiled-layer test pins which declaration
    // wins. The other four are not theme namespaces at all.
    expect(css).toContain(
      '@utility duration-fast {\n  transition-duration: var(--rafters-duration-fast);',
    );
    expect(css).toContain(
      '@utility ease-standard {\n  transition-timing-function: var(--rafters-ease-standard);',
    );
    expect(css).toContain(
      '@utility delay-hover-intent {\n  transition-delay: var(--rafters-delay-hover-intent);',
    );
    expect(css).toContain(
      '@utility extent-pop {\n  --rafters-consumed-extent: var(--rafters-extent-pop);',
    );
    expect(css).toContain(
      '@utility period-spin {\n  animation-duration: var(--rafters-period-spin);',
    );
  });

  it('zeroes duration and delay under reduced motion, and never period', () => {
    const css = emitCSS(baseTokens());
    const blocks = utilityBlocks(css).split('@utility ');
    const block = (name: string) => blocks.find((b) => b.startsWith(`${name} {`)) ?? '';
    expect(block('duration-normal')).toContain('transition-duration: 0ms;');
    expect(block('delay-linger')).toContain('transition-delay: 0ms;');
    // Loops slow, never stop -- a stopped spinner says the work stopped.
    expect(block('period-spin')).not.toContain('prefers-reduced-motion');
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

  it('a shape names a keyframe and carries no duration or curve of its own', () => {
    // INVERTED FROM "builds every animation on the namespace leaves", which
    // asserted the `--animate-*` theme keys held an animation SHORTHAND bundling
    // name, duration and curve. Tailwind compiles such a key to
    // `.animate-scale-out{animation:var(--animate-scale-out)}`, and a shorthand
    // cannot be composed with: a `duration-moderate` typed beside it is either
    // ignored or fighting it on source order.
    //
    // A shape is now name-only, so the duration and the curve are named by their
    // own classes and the three compose into one rule.
    const css = emitCSS(baseTokens());
    expect(css).toContain('@utility animate-scale-out {\n  animation-name: scale-out;\n}');
    expect(css).not.toMatch(/^\s*--animate-[\w-]+:/m);
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
