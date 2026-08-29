/**
 * REAL Tailwind v4 compile probe for `@utility stagger-items` (#2189).
 *
 * Reflection 019f97db: being inside `@theme`/`@utility` source is necessary
 * and not sufficient -- the only real check is compiling and looking at the
 * emitted rule. `registryToCompiled` already runs the actual `@tailwindcss/cli`
 * binary (resolved via `createRequire`, not a hand-rolled regex reader) over
 * this package's own emission, so this probe reuses it rather than shelling
 * out to a second Tailwind install -- see `compiled-standalone.test.ts` for
 * the same pattern applied to the color/spacing utilities.
 *
 * `minify: false` is deliberate: the default (`true`) is validated elsewhere
 * by substring-matching class NAMES, never declaration bodies, and a minifier
 * is free to reformat `calc(3 * var(...))` in ways that would make an
 * assertion against the readable form flaky for reasons that have nothing to
 * do with whether the utility is correct.
 */

import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

// The compiled sheet only contains a rule for a class actually referenced by
// a scanned content source (Tailwind v4's `@source` scan) -- so the fixture's
// only job is to make the literal string `stagger-items` visible to the
// scanner. The compiled output is static CSS: it does not vary with how many
// elements the fixture markup renders, so a 13-item list proves nothing a
// one-line reference does not -- position 13's behavior is a property of the
// CSS rule set (no nth-child(13) exists, so it falls through to `& > *`), not
// of DOM structure.
const FIXTURE_CLASSES = 'stagger-items';

function baseRegistry(): TokenRegistry {
  return new TokenRegistry(generateBaseSystem({}).allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

/** Extract the `@utility stagger-items { ... }` block from compiled CSS. */
function extractStaggerBlock(css: string): string {
  const start = css.indexOf('.stagger-items');
  expect(start, 'compiled CSS does not contain .stagger-items').toBeGreaterThan(-1);
  // Tailwind v4 compiles `@utility stagger-items` to a `.stagger-items { ... }`
  // rule containing nested `&:nth-child(n)` / `& > *` selectors and its own
  // `@media` block -- find the matching close brace by bracket depth.
  let depth = 0;
  let end = start;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return css.slice(start, end);
}

describe('stagger-items: real compiled CSS (#2189)', () => {
  it('compiles the ladder for real and proves position 3 and saturation at 13', async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-stagger-'));
    try {
      writeFileSync(
        join(fixtureDir, 'list.classes.ts'),
        `export const x = '${FIXTURE_CLASSES}';\n`,
      );

      const css = await registryToCompiled(baseRegistry(), {
        contentSources: [fixtureDir],
        minify: false,
      });

      const block = extractStaggerBlock(css);

      // Position 3: the resolved delay is the position multiplied onto the
      // token by calc(), never a literal duration.
      expect(block).toMatch(
        /:nth-child\(3\)[^}]*animation-delay:\s*calc\(3 \* var\(--rafters-delay-stagger-step\)\)/s,
      );

      // Saturation, not truncation or reset: no rule targets position 13 or
      // beyond, and the fallback carries the SAME expression as position 12
      // (compared as text, not asserted twice from the issue's example).
      expect(block).not.toMatch(/nth-child\(13\)/);
      expect(block).not.toMatch(/nth-child\(n *\+ *13\)/);

      const nth12Match = /:nth-child\(12\)[^}]*animation-delay:\s*([^;]+);/s.exec(block);
      const fallbackMatch = /&\s*>\s*\*\s*\{\s*animation-delay:\s*([^;]+);/.exec(block);
      expect(nth12Match?.[1]).toBeDefined();
      expect(fallbackMatch?.[1]).toBeDefined();
      expect(fallbackMatch?.[1]).toBe(nth12Match?.[1]);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('zeroes the delay under prefers-reduced-motion: reduce in the compiled sheet', async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-stagger-reduced-'));
    try {
      writeFileSync(
        join(fixtureDir, 'list.classes.ts'),
        `export const x = '${FIXTURE_CLASSES}';\n`,
      );

      const css = await registryToCompiled(baseRegistry(), {
        contentSources: [fixtureDir],
        minify: false,
      });

      expect(css).toContain('prefers-reduced-motion: reduce');
      const reducedIndex = css.indexOf('prefers-reduced-motion: reduce');
      const nearbyReduced = css.slice(reducedIndex, reducedIndex + 400);
      expect(nearbyReduced).toContain('animation-delay: 0ms');
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});
