/**
 * The named menu-row grid utility is emitted (#2459). classy skips arbitrary
 * track lists, so the track list a menu-style row needs is a named utility.
 */

import { describe, expect, it } from 'vitest';
import { registryToTailwind, TokenRegistry } from '../../src/index.js';

describe('grid track utilities', () => {
  const css = registryToTailwind(
    new TokenRegistry([
      { name: 'depth-base', value: '0', category: 'depth', namespace: 'depth', userOverride: null },
    ]),
  );

  it('emits @utility grid-cols-menu-row with the four menu-row tracks', () => {
    const match = css.match(/@utility grid-cols-menu-row \{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain('grid-template-columns: auto auto 1fr auto;');
  });
});
