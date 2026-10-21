/**
 * A colour family marked generateUtilityClass (added by a `--map color:<name>`
 * entry, #2813) gets an `@source inline` naming every colour utility for its
 * steps; every other family stays scan-only.
 */

import type { OKLCH, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { importColorFamily, registryToTailwind, TokenRegistry } from '../../src/index.js';

const SEED: OKLCH = { l: 0.7, c: 0.15, h: 50, alpha: 1 };

function css(marked: boolean): string {
  const tokens: Token[] = [
    ...importColorFamily('zinc', '500', { l: 0.55, c: 0.01, h: 280, alpha: 1 }),
    ...importColorFamily('nasty-orange', '500', SEED).map((t) =>
      marked && t.name === 'nasty-orange' ? { ...t, generateUtilityClass: true } : t,
    ),
  ];
  return registryToTailwind(new TokenRegistry(tokens));
}

describe('@source inline for added colour families', () => {
  it('names every colour utility root at every step of a marked family', () => {
    const lines = css(true).match(/@source inline\("[^"]+"\);/g) ?? [];
    expect(lines).toHaveLength(1);
    const line = lines[0] ?? '';
    expect(line).toContain('}-nasty-orange-{50,100,200,300,400,500,600,700,800,900,950}');
    for (const root of ['bg', 'text', 'border-bs', 'mask-conic-to', 'scrollbar-track', 'via']) {
      expect(line).toMatch(new RegExp(`[{,]${root}[,}]`));
    }
  });

  it('emits no @source inline for unmarked families', () => {
    expect(css(false)).not.toContain('@source inline');
  });
});
