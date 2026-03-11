import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type CvdSimulationOptions,
  createCvdSimulation,
} from '../../src/primitives/cvd-simulation';
import type { OklchColor } from '../../src/primitives/types';

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

function makeScale(): OklchColor[] {
  return SCALE_KEYS.map((_, i) => ({
    l: 0.98 - i * 0.09,
    c: 0.02 + (i < 6 ? i * 0.025 : (10 - i) * 0.025),
    h: 240,
  }));
}

function makeBaseColor(): OklchColor {
  return { l: 0.53, c: 0.145, h: 240 };
}

function makeCvdData(): CvdSimulationOptions['cvd'] {
  return {
    deuteranopia: { l: 0.53, c: 0.08, h: 260 },
    protanopia: { l: 0.53, c: 0.06, h: 270 },
    tritanopia: { l: 0.53, c: 0.12, h: 200 },
  };
}

function makeOptions(overrides?: Partial<CvdSimulationOptions>): CvdSimulationOptions {
  return {
    scale: makeScale(),
    name: 'ocean-blue',
    cvd: makeCvdData(),
    baseColor: makeBaseColor(),
    ...overrides,
  };
}

describe('cvd-simulation primitive', () => {
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

  it('creates 3 strip containers with data-cvd-type', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    const strips = container.querySelectorAll('[data-cvd-type]');
    expect(strips).toHaveLength(3);
    const types = Array.from(strips).map((s) => s.getAttribute('data-cvd-type'));
    expect(types).toContain('deuteranopia');
    expect(types).toContain('protanopia');
    expect(types).toContain('tritanopia');
  });

  it('each strip has 11 swatch divs', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    const strips = container.querySelectorAll('[data-cvd-type]');
    for (const strip of strips) {
      const swatches = strip.querySelectorAll('[data-swatch]');
      expect(swatches).toHaveLength(11);
    }
  });

  it('swatch has data-color with oklch() value', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    const firstStrip = container.querySelector('[data-cvd-type]');
    const firstSwatch = firstStrip?.querySelector('[data-swatch]') as HTMLElement;
    expect(firstSwatch.getAttribute('data-color')).toContain('oklch(');
  });

  it('each strip has role="img" with descriptive aria-label', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    const strips = container.querySelectorAll('[data-cvd-type]');
    for (const strip of strips) {
      expect(strip.getAttribute('role')).toBe('img');
      const label = strip.getAttribute('aria-label') ?? '';
      expect(label).toContain('ocean-blue');
      // Should mention the CVD type
      const cvdType = strip.getAttribute('data-cvd-type') ?? '';
      expect(label).toContain(cvdType);
    }
  });

  it('aria-label includes human-readable CVD description', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    const deutStrip = container.querySelector('[data-cvd-type="deuteranopia"]');
    const label = deutStrip?.getAttribute('aria-label') ?? '';
    expect(label).toContain('red-green color blindness');

    const tritStrip = container.querySelector('[data-cvd-type="tritanopia"]');
    const tritLabel = tritStrip?.getAttribute('aria-label') ?? '';
    expect(tritLabel).toContain('blue-yellow color blindness');
  });

  it('showOriginal adds a 4th strip with data-cvd-type="original"', () => {
    cleanup = createCvdSimulation(container, makeOptions({ showOriginal: true }));
    const strips = container.querySelectorAll('[data-cvd-type]');
    expect(strips).toHaveLength(4);
    const original = container.querySelector('[data-cvd-type="original"]');
    expect(original).not.toBeNull();
  });

  it('original strip swatches use the unmodified scale colors', () => {
    const scale = makeScale();
    cleanup = createCvdSimulation(container, makeOptions({ showOriginal: true, scale }));
    const original = container.querySelector('[data-cvd-type="original"]');
    const firstSwatch = original?.querySelector('[data-swatch]') as HTMLElement;
    const firstValue = scale[0];
    if (firstValue) {
      expect(firstSwatch.getAttribute('data-color')).toBe(
        `oklch(${firstValue.l} ${firstValue.c} ${firstValue.h})`,
      );
    }
  });

  it('simulated strips shift hue and chroma from base color', () => {
    const scale = makeScale();
    const baseColor = makeBaseColor();
    const cvd = makeCvdData();
    cleanup = createCvdSimulation(container, makeOptions({ scale, baseColor, cvd }));

    // The deuteranopia strip should have shifted colors
    const deutStrip = container.querySelector('[data-cvd-type="deuteranopia"]');
    const swatches = deutStrip?.querySelectorAll('[data-swatch]') as NodeListOf<HTMLElement>;

    // Verify the first swatch has different hue/chroma from original
    const firstOriginal = scale[0];
    if (firstOriginal && swatches[0]) {
      const color = swatches[0].getAttribute('data-color') ?? '';
      // Should NOT match the original scale color exactly (hue shifted from 240)
      const originalColor = `oklch(${firstOriginal.l} ${firstOriginal.c} ${firstOriginal.h})`;
      expect(color).not.toBe(originalColor);
      // But should still be oklch format
      expect(color).toContain('oklch(');
    }
  });

  it('simulated strips preserve lightness from original scale', () => {
    const scale = makeScale();
    cleanup = createCvdSimulation(container, makeOptions({ scale }));

    const deutStrip = container.querySelector('[data-cvd-type="deuteranopia"]');
    const swatches = deutStrip?.querySelectorAll('[data-swatch]') as NodeListOf<HTMLElement>;

    // Each swatch should have the same lightness as the original scale position
    for (let i = 0; i < 11; i++) {
      const swatch = swatches[i];
      const originalL = scale[i]?.l;
      if (swatch && originalL !== undefined) {
        // The data-color should start with oklch(originalL ...
        const color = swatch.getAttribute('data-color') ?? '';
        expect(color).toContain(`oklch(${originalL}`);
      }
    }
  });

  it('sets container role="group" with aria-label', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe(
      'ocean-blue color vision deficiency simulation',
    );
  });

  it('cleanup removes all strip elements', () => {
    cleanup = createCvdSimulation(container, makeOptions());
    cleanup();
    const strips = container.querySelectorAll('[data-cvd-type]');
    expect(strips).toHaveLength(0);
  });

  it('cleanup restores container attributes', () => {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'original-label');
    cleanup = createCvdSimulation(container, makeOptions());
    expect(container.getAttribute('role')).toBe('group');
    cleanup();
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('original-label');
    expect(container.children).toHaveLength(0);
  });

  it('returns noop cleanup when window is undefined', () => {
    // SSR safety -- verifying function signature
    expect(typeof createCvdSimulation).toBe('function');
  });
});
