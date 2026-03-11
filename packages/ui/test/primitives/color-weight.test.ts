import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ColorWeightOptions, createColorWeight } from '../../src/primitives/color-weight';
import type { CleanupFunction } from '../../src/primitives/types';

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const defaultOptions: ColorWeightOptions = {
  perceptualWeight: {
    weight: 0.72,
    density: 'medium',
    balancingRecommendation: 'Pair with a lighter element to balance visual weight.',
  },
  atmosphericWeight: {
    distanceWeight: 0.45,
    temperature: 'warm',
    atmosphericRole: 'midground',
  },
};

describe('color-weight', () => {
  let container: HTMLElement;
  let cleanup: CleanupFunction;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    cleanup?.();
    container.remove();
  });

  describe('data attributes', () => {
    it('sets data-perceptual-weight to numeric string', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-perceptual-weight')).toBe('0.72');
    });

    it('sets data-density', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-density')).toBe('medium');
    });

    it('sets data-atmospheric-role', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-atmospheric-role')).toBe('midground');
    });

    it('sets data-distance-weight to numeric string', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-distance-weight')).toBe('0.45');
    });

    it('sets data-temperature', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-temperature')).toBe('warm');
    });

    it('handles light density', () => {
      cleanup = createColorWeight(container, {
        ...defaultOptions,
        perceptualWeight: {
          ...defaultOptions.perceptualWeight,
          density: 'light',
        },
      });
      expect(container.getAttribute('data-density')).toBe('light');
    });

    it('handles heavy density', () => {
      cleanup = createColorWeight(container, {
        ...defaultOptions,
        perceptualWeight: {
          ...defaultOptions.perceptualWeight,
          density: 'heavy',
        },
      });
      expect(container.getAttribute('data-density')).toBe('heavy');
    });

    it('handles cool temperature', () => {
      cleanup = createColorWeight(container, {
        ...defaultOptions,
        atmosphericWeight: {
          ...defaultOptions.atmosphericWeight,
          temperature: 'cool',
        },
      });
      expect(container.getAttribute('data-temperature')).toBe('cool');
    });

    it('handles neutral temperature', () => {
      cleanup = createColorWeight(container, {
        ...defaultOptions,
        atmosphericWeight: {
          ...defaultOptions.atmosphericWeight,
          temperature: 'neutral',
        },
      });
      expect(container.getAttribute('data-temperature')).toBe('neutral');
    });
  });

  describe('child elements', () => {
    it('creates perceptual weight section with aria-label', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Perceptual weight"]');
      expect(section).not.toBeNull();
    });

    it('perceptual section shows weight score', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Perceptual weight"]');
      expect(section?.textContent).toContain('0.72');
    });

    it('perceptual section shows density label', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Perceptual weight"]');
      expect(section?.textContent).toContain('medium');
    });

    it('creates atmospheric weight section with aria-label', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Atmospheric weight"]');
      expect(section).not.toBeNull();
    });

    it('atmospheric section shows role', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Atmospheric weight"]');
      expect(section?.textContent).toContain('midground');
    });

    it('atmospheric section shows distance weight', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const section = container.querySelector('[aria-label="Atmospheric weight"]');
      expect(section?.textContent).toContain('0.45');
    });

    it('creates recommendation element with role="note"', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const note = container.querySelector('[role="note"]');
      expect(note).not.toBeNull();
    });

    it('recommendation element has correct text content', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const note = container.querySelector('[role="note"]');
      expect(note?.textContent).toBe('Pair with a lighter element to balance visual weight.');
    });

    it('recommendation element has aria-label', () => {
      cleanup = createColorWeight(container, defaultOptions);
      const note = container.querySelector('[role="note"]');
      expect(note?.getAttribute('aria-label')).toBe('Balancing recommendation');
    });
  });

  describe('cleanup', () => {
    it('removes child elements', () => {
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.children.length).toBeGreaterThan(0);
      cleanup();
      expect(container.children.length).toBe(0);
    });

    it('removes data attributes', () => {
      cleanup = createColorWeight(container, defaultOptions);
      cleanup();
      expect(container.getAttribute('data-perceptual-weight')).toBeNull();
      expect(container.getAttribute('data-density')).toBeNull();
      expect(container.getAttribute('data-atmospheric-role')).toBeNull();
      expect(container.getAttribute('data-distance-weight')).toBeNull();
      expect(container.getAttribute('data-temperature')).toBeNull();
    });

    it('restores pre-existing attributes', () => {
      container.setAttribute('data-density', 'custom');
      cleanup = createColorWeight(container, defaultOptions);
      expect(container.getAttribute('data-density')).toBe('medium');
      cleanup();
      expect(container.getAttribute('data-density')).toBe('custom');
    });
  });

  describe('SSR safety', () => {
    it('returns noop when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error -- simulating SSR by deleting window
      delete globalThis.window;
      try {
        const noopCleanup = createColorWeight(container, defaultOptions);
        expect(typeof noopCleanup).toBe('function');
        noopCleanup(); // should not throw
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});
