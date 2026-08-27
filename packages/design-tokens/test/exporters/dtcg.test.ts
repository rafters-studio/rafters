/**
 * Pins the family-summary `oklch()` literal (colorValue.scale[5], the
 * exporter's "base color") through the #2147 migration from a hand-rolled
 * template literal (`oklch(${l} ${c} ${h})`) to `oklchToCSS(baseColor)`.
 *
 * Neither form rounds or applies precision -- both stringify the raw
 * numbers -- so this is byte-identical by construction, not just for
 * these particular values.
 */
import { describe, expect, it } from 'vitest';
import { toDTCG } from '../../src/exporters/dtcg.js';
import { generateBaseSystem } from '../../src/generators/index.js';

describe('toDTCG oklch formatting', () => {
  it('produces byte-identical oklch() strings after the oklchToCSS migration', () => {
    const system = generateBaseSystem({});
    const dtcg = JSON.stringify(toDTCG(system.allTokens));
    expect(dtcg).toContain('"oklch(0.552 0 0)"');
    expect(dtcg).toContain('"oklch(0.645 0.12 180)"');
  });
});
