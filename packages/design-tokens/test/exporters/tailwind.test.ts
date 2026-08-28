/**
 * Pins the family-summary `oklch()` literal (colorValue.scale[5], the
 * exporter's "base color") through the #2147 migration from the local
 * `formatNumber` helper (round to 3 decimals, then strip trailing zeros
 * via `Number(...).toString()`) to `oklchToCSS`.
 *
 * The default-system fixture below happens to reach this exporter already
 * rounded to <=3 decimals (roundOKLCH via generateOKLCHScale, or the
 * hardcoded DEFAULT_NEUTRAL_SCALE), so it alone would not catch a
 * regression in full-precision or alpha-carrying input -- see the
 * `imported-primary` case, which does. The exporter pre-rounds each
 * channel with `toFixed(3)` and forces `alpha: 1` before calling
 * `oklchToCSS`, exactly reproducing the old formatNumber's
 * round-then-strip-trailing-zeros behavior AND its unconditional alpha
 * drop, for every OKLCH this exporter can receive -- not just already-
 * rounded ones.
 *
 * `zinc` is anchored to the hardcoded `DEFAULT_NEUTRAL_SCALE`; the
 * `silver-true-glacier` assertion additionally exercises a non-zero
 * chroma and tracks `DEFAULT_COLOR_PALETTE_BASES` -- retuning that
 * palette's hue/chroma is expected to move this literal too.
 */
import { hexToOKLCH } from '@rafters/color-utils';
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import { importColorFamily } from '../../src/importers/color.js';

describe('tokensToTailwind oklch formatting', () => {
  it('produces byte-identical oklch() strings after the oklchToCSS migration', () => {
    const system = generateBaseSystem({});
    const css = tokensToTailwind(system.allTokens, { includeImport: false }, []);
    expect(css).toContain('--color-zinc: oklch(0.552 0 0);');
    expect(css).toContain('--color-silver-true-glacier: oklch(0.645 0.12 180);');
  });

  it('rounds a full-precision, alpha-carrying imported seed exactly as the old formatNumber did (no alpha channel)', () => {
    const seed = hexToOKLCH('rgba(59, 130, 246, 0.5)');
    const tokens = importColorFamily('imported-primary', '500', seed);
    const css = tokensToTailwind(tokens, { includeImport: false }, []);
    expect(css).toContain('--color-imported-primary: oklch(0.623 0.188 259.815);');
  });
});
