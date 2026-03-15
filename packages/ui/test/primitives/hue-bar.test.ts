import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHueBar, updateHueBar } from '../../src/primitives/hue-bar';

describe('createHueBar', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    canvas.remove();
  });

  it('returns a cleanup function', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('sets role="img"', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    expect(canvas.getAttribute('role')).toBe('img');
    cleanup();
  });

  it('sets aria-label="Hue spectrum"', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    expect(canvas.getAttribute('aria-label')).toBe('Hue spectrum');
    cleanup();
  });

  it('cleanup restores original attributes', () => {
    canvas.setAttribute('role', 'presentation');
    canvas.setAttribute('aria-label', 'original');

    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Hue spectrum');

    cleanup();

    expect(canvas.getAttribute('role')).toBe('presentation');
    expect(canvas.getAttribute('aria-label')).toBe('original');
  });

  it('cleanup removes attributes that were not originally present', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    cleanup();

    expect(canvas.hasAttribute('role')).toBe(false);
    expect(canvas.hasAttribute('aria-label')).toBe(false);
  });

  it('accepts vertical orientation', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15, orientation: 'vertical' });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('accepts vivid option', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15, vivid: true });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('sets aria-label in vivid mode', () => {
    const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15, vivid: true });
    expect(canvas.getAttribute('aria-label')).toBe('Hue spectrum');
    cleanup();
  });
});

describe('updateHueBar', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    canvas.remove();
  });

  it('maintains aria-label after update', () => {
    createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    updateHueBar(canvas, { lightness: 0.5, chroma: 0.1 });
    expect(canvas.getAttribute('aria-label')).toBe('Hue spectrum');
  });

  it('supports updating to vivid mode', () => {
    createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
    expect(() => {
      updateHueBar(canvas, { lightness: 0.7, chroma: 0.15, vivid: true });
    }).not.toThrow();
  });
});

describe('SSR safety', () => {
  it('returns a no-op cleanup when window is undefined', () => {
    const savedWindow = globalThis.window;
    delete (globalThis as Record<string, unknown>).window;
    try {
      const canvas = {} as HTMLCanvasElement;
      const cleanup = createHueBar(canvas, { lightness: 0.7, chroma: 0.15 });
      expect(typeof cleanup).toBe('function');
      cleanup(); // should not throw
    } finally {
      globalThis.window = savedWindow;
    }
  });
});
