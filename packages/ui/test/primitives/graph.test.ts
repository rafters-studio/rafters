/**
 * Tests for graph core primitive
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  arcPath,
  createGraph,
  linearScale,
  linePath,
  polarToCartesian,
  smoothPath,
} from '../../src/primitives/graph';

describe('createGraph', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  });

  it('creates SVG element in container', () => {
    const graph = createGraph({ container, width: 200, height: 100 });
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 200 100');
    graph.destroy();
  });

  it('defaults to SVG renderer', () => {
    const graph = createGraph({ container });
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('canvas')).toBeNull();
    graph.destroy();
  });

  it('creates canvas element when renderer is canvas', () => {
    const graph = createGraph({ container, renderer: 'canvas', width: 200, height: 100 });
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas?.width).toBe(200);
    expect(canvas?.height).toBe(100);
    graph.destroy();
  });

  it('uses default dimensions when not specified', () => {
    const graph = createGraph({ container });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 200');
    graph.destroy();
  });

  it('sets role="img" on SVG for accessibility', () => {
    const graph = createGraph({ container });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    graph.destroy();
  });

  it('throws when container is null', () => {
    expect(() => createGraph({ container: null as unknown as HTMLElement })).toThrow(
      'Graph container is required',
    );
  });

  it('exposes element reference', () => {
    const graph = createGraph({ container });
    expect(graph.element).toBeTruthy();
    expect(graph.element instanceof SVGSVGElement).toBe(true);
    graph.destroy();
  });

  describe('resize', () => {
    it('updates SVG viewBox', () => {
      const graph = createGraph({ container, width: 200, height: 100 });
      graph.resize(400, 300);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 400 300');
      graph.destroy();
    });

    it('updates canvas dimensions', () => {
      const graph = createGraph({ container, renderer: 'canvas', width: 200, height: 100 });
      graph.resize(400, 300);
      const canvas = container.querySelector('canvas');
      expect(canvas?.width).toBe(400);
      expect(canvas?.height).toBe(300);
      graph.destroy();
    });
  });

  describe('destroy', () => {
    it('removes element from container', () => {
      const graph = createGraph({ container });
      expect(container.querySelector('svg')).toBeTruthy();
      graph.destroy();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('nulls element reference', () => {
      const graph = createGraph({ container });
      graph.destroy();
      expect(graph.element).toBeNull();
    });

    it('is idempotent', () => {
      const graph = createGraph({ container });
      graph.destroy();
      expect(() => graph.destroy()).not.toThrow();
    });

    it('resize is safe after destroy', () => {
      const graph = createGraph({ container });
      graph.destroy();
      expect(() => graph.resize(100, 100)).not.toThrow();
    });
  });
});

describe('linearScale', () => {
  it('maps domain to range', () => {
    const scale = linearScale([0, 100], [0, 200]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(100);
    expect(scale(100)).toBe(200);
  });

  it('handles inverted domains', () => {
    const scale = linearScale([100, 0], [0, 200]);
    expect(scale(100)).toBe(0);
    expect(scale(0)).toBe(200);
    expect(scale(50)).toBe(100);
  });

  it('handles inverted ranges', () => {
    const scale = linearScale([0, 100], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(100)).toBe(0);
    expect(scale(50)).toBe(100);
  });

  it('handles zero-width domain', () => {
    const scale = linearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(0);
    expect(scale(10)).toBe(0);
  });

  it('extrapolates beyond domain', () => {
    const scale = linearScale([0, 100], [0, 200]);
    expect(scale(150)).toBe(300);
    expect(scale(-50)).toBe(-100);
  });

  it('maps fractional values', () => {
    const scale = linearScale([0, 1], [0, 100]);
    expect(scale(0.5)).toBe(50);
    expect(scale(0.25)).toBe(25);
  });
});

describe('polarToCartesian', () => {
  it('computes 0 degrees (right)', () => {
    const p = polarToCartesian(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(10, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('computes 90 degrees (up)', () => {
    const p = polarToCartesian(0, 0, 10, 90);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(-10, 5);
  });

  it('computes 180 degrees (left)', () => {
    const p = polarToCartesian(0, 0, 10, 180);
    expect(p.x).toBeCloseTo(-10, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('computes 270 degrees (down)', () => {
    const p = polarToCartesian(0, 0, 10, 270);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(10, 5);
  });

  it('respects center offset', () => {
    const p = polarToCartesian(50, 50, 10, 0);
    expect(p.x).toBeCloseTo(60, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });
});

describe('linePath', () => {
  it('returns empty string for empty points', () => {
    expect(linePath([])).toBe('');
  });

  it('returns M command for single point', () => {
    expect(linePath([{ x: 10, y: 20 }])).toBe('M 10 20');
  });

  it('builds line path for multiple points', () => {
    const path = linePath([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ]);
    expect(path).toBe('M 0 0 L 50 50 L 100 0');
  });
});

describe('smoothPath', () => {
  it('returns empty string for empty points', () => {
    expect(smoothPath([])).toBe('');
  });

  it('returns M command for single point', () => {
    expect(smoothPath([{ x: 10, y: 20 }])).toBe('M 10 20');
  });

  it('falls back to linePath for two points', () => {
    const path = smoothPath([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(path).toBe('M 0 0 L 100 100');
  });

  it('generates cubic bezier for three+ points', () => {
    const path = smoothPath([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ]);
    expect(path).toMatch(/^M\s/);
    expect(path).toContain('C');
  });
});

describe('arcPath', () => {
  it('generates valid SVG arc path', () => {
    const path = arcPath(50, 50, 40, 0, 90);
    expect(path).toMatch(/^M\s/);
    expect(path).toContain('A');
    expect(path).toContain('40 40');
  });

  it('handles large arcs (> 180 degrees)', () => {
    const path = arcPath(50, 50, 40, 0, 270);
    expect(path).toContain('1 0');
  });

  it('handles small arcs (< 180 degrees)', () => {
    const path = arcPath(50, 50, 40, 0, 90);
    expect(path).toContain('0 0');
  });
});
