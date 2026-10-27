/**
 * Depth words reach Tailwind's stock z utility (#2825).
 *
 * Components speak z-depth-modal / z-depth-overlay because agents need words,
 * not numbers, to say where something sits. Tailwind v4's z utility reads the
 * --z-index-* theme namespace, so each depth token is a --z-index-depth-<name>
 * key carrying var(--rafters-depth-<name>); no hand-written @utility exists.
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

  it('emits one --z-index-depth-<name> theme key per depth token', () => {
    for (const name of DEPTH_NAMES) {
      expect(css).toContain(`--z-index-${name}: var(--rafters-${name});`);
    }
  });

  it('emits the --rafters-* property the key references', () => {
    for (const name of DEPTH_NAMES) {
      expect(css).toContain(`--rafters-${name}:`);
    }
  });

  it('writes no @utility z-depth rule', () => {
    expect(css).not.toContain('@utility z-depth');
  });

  it('reference tokens (JSON values) do not emit dangling theme keys', () => {
    const registry = buildDepthRegistry();
    registry.define({
      name: 'depth-scale',
      value: JSON.stringify({ gap: 10, levels: {} }),
      category: 'depth',
      namespace: 'depth',
      userOverride: null,
    });
    const out = registryToTailwind(registry);
    // depth-scale is JSON, not an integer: it gets no theme key pointing at nothing.
    expect(out).not.toContain('--z-index-depth-scale');
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
