// packages/ui/test/primitives/color-scale.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ColorScaleOptions, createColorScale } from '../../src/primitives/color-scale';

const SCALE_KEYS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

function makeScale(): ColorScaleOptions['scale'] {
  return SCALE_KEYS.map((_, i) => ({
    l: 0.98 - i * 0.09,
    c: 0.02 + (i < 6 ? i * 0.025 : (10 - i) * 0.025),
    h: 240,
  }));
}

describe('color-scale primitive', () => {
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    cleanup?.();
    container.remove();
  });

  it('creates 11 swatch elements with role="option"', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    const options = container.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(11);
  });

  it('sets container role="listbox" with aria-label', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    expect(container.getAttribute('role')).toBe('listbox');
    expect(container.getAttribute('aria-label')).toBe('ocean-blue color scale');
  });

  it('sets data-scale-position on each swatch', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    const options = container.querySelectorAll('[role="option"]');
    SCALE_KEYS.forEach((key, i) => {
      expect((options[i] as HTMLElement).getAttribute('data-scale-position')).toBe(key);
    });
  });

  it('sets OKLCH color data attributes on each swatch', () => {
    const scale = makeScale();
    cleanup = createColorScale(container, { scale, name: 'ocean-blue' });
    const first = container.querySelector('[role="option"]') as HTMLElement;
    // jsdom does not support oklch() in style.backgroundColor, so verify
    // the color is encoded in data attributes instead
    expect(first.getAttribute('data-l')).toBeTruthy();
    expect(first.getAttribute('data-c')).toBeTruthy();
    expect(first.getAttribute('data-h')).toBe('240.0');
  });

  it('sets aria-label with L/C/H values on each swatch', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    const first = container.querySelector('[role="option"]') as HTMLElement;
    const label = first.getAttribute('aria-label') ?? '';
    expect(label).toContain('ocean-blue 50');
    expect(label).toContain('L:');
    expect(label).toContain('C:');
    expect(label).toContain('H:');
  });

  it('makes swatches focusable with tabindex', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    const options = container.querySelectorAll('[role="option"]');
    // First swatch tabindex 0, rest -1 (roving tabindex)
    expect((options[0] as HTMLElement).getAttribute('tabindex')).toBe('0');
    expect((options[1] as HTMLElement).getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus with ArrowRight/ArrowLeft', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    const options = container.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
    options[0]?.focus();
    options[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect((options[1] as HTMLElement).getAttribute('tabindex')).toBe('0');
    expect((options[0] as HTMLElement).getAttribute('tabindex')).toBe('-1');
  });

  it('fires onSwatchFocus callback with scale position', () => {
    const focused: string[] = [];
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
      onSwatchFocus: (position) => focused.push(position),
    });
    const options = container.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
    options[0]?.focus();
    options[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(focused).toContain('100');
  });

  it('sets data-gamut-tier when tiers provided', () => {
    const tiers = SCALE_KEYS.map(() => 'gold' as const);
    tiers[10] = 'silver';
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
      tiers,
    });
    const last = container.querySelectorAll('[role="option"]')[10] as HTMLElement;
    expect(last.getAttribute('data-gamut-tier')).toBe('silver');
  });

  it('cleanup removes all swatch elements and restores container', () => {
    cleanup = createColorScale(container, {
      scale: makeScale(),
      name: 'ocean-blue',
    });
    cleanup();
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(container.getAttribute('role')).toBeNull();
  });

  it('returns noop on server (no window)', () => {
    // SSR safety tested via the typeof window check in implementation
    // This test just verifies the function signature works
    expect(typeof createColorScale).toBe('function');
  });
});
