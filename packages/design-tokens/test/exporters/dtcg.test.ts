/**
 * Pins the family-summary `oklch()` literal (colorValue.scale[5], the
 * exporter's "base color") through the #2147 migration from a hand-rolled
 * template literal (`oklch(${l} ${c} ${h})`) to `oklchToCSS(baseColor)`.
 *
 * Neither form rounds or applies precision -- both stringify the raw
 * numbers the same way -- so L/C/H are byte-identical by construction.
 * Alpha is forced to 1 before the call, because the old template literal
 * had no fourth channel at all; this exporter is fully byte-identical,
 * unlike `typescript.ts` (which still diverges on H's trailing zeros --
 * see that file's test). The default-system fixture below never carries
 * alpha, so it can't exercise the forcing; the `imported-primary` case
 * does.
 */
import { hexToOKLCH } from '@rafters/color-utils';
import { describe, expect, it } from 'vitest';
import { toDTCG } from '../../src/exporters/dtcg.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import { importColorFamily } from '../../src/importers/color.js';

describe('toDTCG oklch formatting', () => {
  it('produces byte-identical oklch() strings after the oklchToCSS migration', () => {
    const system = generateBaseSystem({});
    const dtcg = JSON.stringify(toDTCG(system.allTokens));
    expect(dtcg).toContain('"oklch(0.552 0 0)"');
    expect(dtcg).toContain('"oklch(0.645 0.12 180)"');
  });

  it('drops alpha for a full-precision, alpha-carrying imported seed, exactly as the old template literal did', () => {
    const seed = hexToOKLCH('rgba(59, 130, 246, 0.5)');
    const tokens = importColorFamily('imported-primary', '500', seed);
    const dtcg = JSON.stringify(toDTCG(tokens));
    expect(dtcg).toContain('"oklch(0.6230830326348528 0.18801473450792203 259.8145285254815)"');
  });
});
