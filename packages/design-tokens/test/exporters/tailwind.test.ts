/**
 * Pins the family-summary `oklch()` literal (colorValue.scale[5], the
 * exporter's "base color") through the #2147 migration from the local
 * `formatNumber` helper (round to 3 decimals, then strip trailing zeros
 * via `Number(...).toString()`) to `oklchToCSS(baseColor)` with no
 * precision option.
 *
 * Every OKLCH value that reaches this exporter has already been rounded
 * to <=3 decimals upstream (roundOKLCH via generateOKLCHScale, or the
 * hardcoded DEFAULT_NEUTRAL_SCALE), so formatNumber(v) === String(v) for
 * all of them: oklchToCSS's no-rounding String() formatting is
 * byte-identical to the old strip-trailing-zeros behavior. These two
 * literals are the exact strings the pre-#2147 exporter already emitted
 * (see apps/demo/.rafters/output/rafters.css), so this is a true
 * before-and-after byte-identical proof, not just a post-refactor pin.
 *
 * `zinc` is anchored to the hardcoded `DEFAULT_NEUTRAL_SCALE`; the
 * `silver-true-glacier` assertion additionally exercises a non-zero
 * chroma and tracks `DEFAULT_COLOR_PALETTE_BASES` -- retuning that
 * palette's hue/chroma is expected to move this literal too.
 */
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';
import { generateBaseSystem } from '../../src/generators/index.js';

describe('tokensToTailwind oklch formatting', () => {
  it('produces byte-identical oklch() strings after the oklchToCSS migration', () => {
    const system = generateBaseSystem({});
    const css = tokensToTailwind(system.allTokens, { includeImport: false }, []);
    expect(css).toContain('--color-zinc: oklch(0.552 0 0);');
    expect(css).toContain('--color-silver-true-glacier: oklch(0.645 0.12 180);');
  });
});
