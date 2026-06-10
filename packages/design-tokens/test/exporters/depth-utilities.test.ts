/**
 * Depth words emit as real utilities (#1638 S3, the Tailwind namespace rule).
 *
 * Components speak z-depth-modal / z-depth-overlay because agents need words,
 * not numbers, to say where something sits. Tailwind v4 does not theme
 * z-index, so the exporter must emit @utility rules or every one of those
 * classes is a silent no-op (which is exactly what shipped before this test).
 */

import { describe, expect, it } from 'vitest';
import { registryToTailwind, TokenRegistry } from '../../src/index.js';

const DEPTH_NAMES = [
  'depth-base',
  'depth-dropdown',
  'depth-sticky',
  'depth-navigation',
  'depth-modal',
  'depth-popover',
  'depth-tooltip',
  'depth-overlay',
] as const;

function buildDepthRegistry(): TokenRegistry {
  const tokens = DEPTH_NAMES.map((name, index) => ({
    name,
    value: String(index * 10),
    category: 'depth',
    namespace: 'depth',
    userOverride: null,
  }));
  return new TokenRegistry(tokens);
}

describe('depth z-index utilities', () => {
  const css = registryToTailwind(buildDepthRegistry());

  it('emits one @utility z-<name> per depth token', () => {
    for (const name of DEPTH_NAMES) {
      expect(css).toContain(`@utility z-${name} {`);
      expect(css).toContain(`z-index: var(--${name});`);
    }
  });

  it('emits the custom property the utility references', () => {
    for (const name of DEPTH_NAMES) {
      expect(css).toContain(`--${name}:`);
    }
  });

  it('the component vocabulary resolves -- the six class files stop being no-ops', () => {
    // The exact words found in packages/ui component classes tonight.
    for (const word of [
      'z-depth-overlay',
      'z-depth-modal',
      'z-depth-dropdown',
      'z-depth-popover',
      'z-depth-navigation',
    ]) {
      expect(css).toContain(`@utility ${word} {`);
    }
  });
});
