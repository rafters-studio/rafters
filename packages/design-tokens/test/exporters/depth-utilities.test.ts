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

  it('reference tokens (JSON values) do not emit dangling utilities', () => {
    const registry = buildDepthRegistry();
    registry.define({
      name: 'depth-scale',
      value: JSON.stringify({ gap: 10, levels: {} }),
      category: 'depth',
      namespace: 'depth',
      userOverride: null,
    });
    const out = registryToTailwind(registry);
    // tokenValueToCSS skips JSON values, so --depth-scale never exists in
    // :root; the utility must not be emitted pointing at nothing.
    expect(out).not.toContain('@utility z-depth-scale');
  });
});

describe('depth ladder stacking invariants (#1655)', () => {
  // The defaults are the shipped ladder; these invariants are what the
  // components' word usage relies on. A value change that breaks one of
  // these reintroduces backdrop-over-content or menu-behind-chrome.
  it('backdrops dim behind the modal they serve, above fixed chrome', async () => {
    const { DEFAULT_DEPTH_DEFINITIONS: d } = await import('../../src/generators/defaults.js');
    expect(d.overlay.value).toBeLessThan(d.modal.value);
    expect(d.overlay.value).toBeGreaterThan(d.fixed.value);
  });

  it('menu content beats page chrome and survives opening inside a dialog', async () => {
    const { DEFAULT_DEPTH_DEFINITIONS: d } = await import('../../src/generators/defaults.js');
    expect(d.dropdown.value).toBeGreaterThan(d.sticky.value);
    expect(d.dropdown.value).toBeGreaterThan(d.navigation.value);
    expect(d.dropdown.value).toBeGreaterThan(d.fixed.value);
    expect(d.dropdown.value).toBeGreaterThan(d.modal.value);
  });

  it('popover above modal, tooltip above popover, chrome below all overlays', async () => {
    const { DEFAULT_DEPTH_DEFINITIONS: d } = await import('../../src/generators/defaults.js');
    expect(d.popover.value).toBeGreaterThan(d.modal.value);
    expect(d.tooltip.value).toBeGreaterThan(d.popover.value);
    for (const chrome of ['sticky', 'navigation', 'fixed'] as const) {
      expect(d[chrome].value).toBeLessThan(d.overlay.value);
      expect(d[chrome].value).toBeLessThan(d.modal.value);
    }
    expect(d.base.value).toBe(0);
  });
});
