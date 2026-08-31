/**
 * Tests for graph core primitive
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  areaPath,
  arcPath,
  bandScale,
  createGraph,
  gridLines,
  linearScale,
  linePath,
  observeResize,
  polarToCartesian,
  radarPath,
  radialToCartesian,
  slicePath,
  smoothPath,
  ticks,
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

  it('does not set inline color styles on the element', () => {
    const graph = createGraph({ container });
    const svg = container.querySelector('svg');
    expect(svg?.style.color).toBe('');
    expect(svg?.style.backgroundColor).toBe('');
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

describe('bandScale', () => {
  it('maps categorical values to evenly-spaced bands (no padding)', () => {
    const s = bandScale(['a', 'b', 'c'] as const, [0, 300]);
    expect(s.scale('a')).toBe(0);
    expect(s.scale('b')).toBe(100);
    expect(s.scale('c')).toBe(200);
    expect(s.bandwidth()).toBe(100);
    expect(s.step()).toBe(100);
  });

  it('returns range start for unknown values', () => {
    const s = bandScale(['a', 'b'] as const, [0, 200]);
    expect(s.scale('z' as 'a')).toBe(0);
  });

  it('handles empty domain', () => {
    const s = bandScale([] as const, [0, 300]);
    expect(s.bandwidth()).toBe(0);
    expect(s.step()).toBe(0);
  });

  it('handles single value domain', () => {
    const s = bandScale(['only'] as const, [0, 100]);
    expect(s.scale('only')).toBe(0);
    expect(s.bandwidth()).toBe(100);
  });

  it('preserves domain and range', () => {
    const s = bandScale(['x', 'y'] as const, [10, 50]);
    expect(s.domain).toEqual(['x', 'y']);
    expect(s.range).toEqual([10, 50]);
  });

  it('handles non-zero range start', () => {
    const s = bandScale(['a', 'b'] as const, [50, 150]);
    expect(s.scale('a')).toBe(50);
    expect(s.scale('b')).toBe(100);
    expect(s.bandwidth()).toBe(50);
  });

  it('applies paddingInner between bands', () => {
    const s = bandScale(['a', 'b', 'c'] as const, [0, 300], { paddingInner: 0.5 });
    const bw = s.bandwidth();
    const st = s.step();
    expect(bw).toBeLessThan(st);
    expect(bw).toBeCloseTo(st * 0.5, 5);
    expect(s.scale('b')).toBeCloseTo(s.scale('a') + st, 5);
  });

  it('applies paddingOuter before first and after last band', () => {
    const s = bandScale(['a', 'b'] as const, [0, 200], { paddingOuter: 0.5 });
    expect(s.scale('a')).toBeGreaterThan(0);
    const lastEnd = s.scale('b') + s.bandwidth();
    expect(lastEnd).toBeLessThan(200);
  });

  it('bandwidth() and step() are callable', () => {
    const s = bandScale(['a', 'b'] as const, [0, 100]);
    expect(typeof s.bandwidth).toBe('function');
    expect(typeof s.step).toBe('function');
    expect(s.bandwidth()).toBeGreaterThan(0);
    expect(s.step()).toBeGreaterThan(0);
  });
});

describe('ticks', () => {
  it('generates nice round tick values', () => {
    const t = ticks(0, 100, 5);
    expect(t).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('handles min equal to max', () => {
    const t = ticks(5, 5, 5);
    expect(t).toEqual([5]);
  });

  it('handles zero count', () => {
    const t = ticks(0, 100, 0);
    expect(t).toEqual([0]);
  });

  it('generates ticks for small ranges', () => {
    const t = ticks(0, 1, 5);
    expect(t.length).toBeGreaterThan(0);
    for (const v of t) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('generates ticks for large ranges', () => {
    const t = ticks(0, 10000, 5);
    expect(t.length).toBeGreaterThan(0);
    expect(t[0]).toBeGreaterThanOrEqual(0);
    expect(t[t.length - 1] as number).toBeLessThanOrEqual(10000);
  });

  it('produces values within the domain', () => {
    const t = ticks(3, 97, 10);
    for (const v of t) {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(97);
    }
  });
});

describe('gridLines', () => {
  it('generates horizontal and vertical gridlines from ticks', () => {
    const plotArea = { x1: 0, y1: 0, x2: 300, y2: 200 };
    const g = gridLines([50, 100, 150], [40, 80, 120], plotArea);

    expect(g.horizontal).toHaveLength(3);
    expect(g.vertical).toHaveLength(3);

    expect(g.horizontal[0]).toEqual({ y: 40, x1: 0, x2: 300 });
    expect(g.vertical[0]).toEqual({ x: 50, y1: 0, y2: 200 });
  });

  it('handles empty tick arrays', () => {
    const plotArea = { x1: 0, y1: 0, x2: 100, y2: 100 };
    const g = gridLines([], [], plotArea);
    expect(g.horizontal).toHaveLength(0);
    expect(g.vertical).toHaveLength(0);
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

describe('areaPath', () => {
  it('returns empty string for empty points', () => {
    expect(areaPath([], 100)).toBe('');
  });

  it('builds a closed area with straight lines by default', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 100, y: 30 },
      { x: 200, y: 70 },
    ];
    const path = areaPath(points, 100);
    expect(path).toMatch(/^M 0 50/);
    expect(path).toContain('L 200 100');
    expect(path).toContain('L 0 100');
    expect(path).toContain('Z');
  });

  it('uses smooth interpolation when smooth is true', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 50, y: 30 },
      { x: 100, y: 70 },
    ];
    const path = areaPath(points, 100, true);
    expect(path).toContain('C');
    expect(path).toContain('Z');
  });

  it('closes back to the first x at the baseline', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 90, y: 40 },
    ];
    const path = areaPath(points, 200);
    expect(path).toContain('L 90 200');
    expect(path).toContain('L 10 200');
  });
});

describe('slicePath', () => {
  it('builds a pie slice (innerRadius = 0)', () => {
    const path = slicePath(100, 100, 50, 0, 0, 90);
    expect(path).toContain('M 100 100');
    expect(path).toContain('A 50 50');
    expect(path).toContain('Z');
  });

  it('builds a donut slice with inner radius', () => {
    const path = slicePath(100, 100, 50, 20, 0, 90);
    expect(path).not.toContain('M 100 100');
    expect(path).toContain('A 50 50');
    expect(path).toContain('A 20 20');
    expect(path).toContain('Z');
  });

  it('handles large arc (> 180 degrees)', () => {
    const path = slicePath(100, 100, 50, 0, 0, 270);
    expect(path).toContain('1 1');
  });

  it('handles full circle (360 degrees minus epsilon)', () => {
    const path = slicePath(100, 100, 50, 0, 0, 359.99);
    expect(path).toContain('A 50 50');
  });
});

describe('radialToCartesian', () => {
  it('0 degrees points up (12 o-clock)', () => {
    const p = radialToCartesian(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(-10, 5);
  });

  it('90 degrees points right (3 o-clock)', () => {
    const p = radialToCartesian(0, 0, 10, 90);
    expect(p.x).toBeCloseTo(10, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('180 degrees points down (6 o-clock)', () => {
    const p = radialToCartesian(0, 0, 10, 180);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(10, 5);
  });

  it('respects center offset', () => {
    const p = radialToCartesian(50, 50, 10, 0);
    expect(p.x).toBeCloseTo(50, 5);
    expect(p.y).toBeCloseTo(40, 5);
  });
});

describe('radarPath', () => {
  it('returns empty string for empty values', () => {
    expect(radarPath(0, 0, [], 50)).toBe('');
  });

  it('builds a closed polygon from values', () => {
    const path = radarPath(100, 100, [1, 1, 1], 50);
    expect(path).toMatch(/^M/);
    expect(path).toContain('Z');
  });

  it('produces three points for three values', () => {
    const path = radarPath(100, 100, [1, 0.5, 0.8], 50);
    const segments = path.split(/[MLZ]/).filter(Boolean);
    expect(segments.length).toBe(3);
  });

  it('scales values by maxRadius', () => {
    const path = radarPath(0, 0, [1], 100);
    expect(path).toMatch(/-100/);
    expect(path).toMatch(/^M/);
  });
});

describe('observeResize', () => {
  it('calls callback on size changes', async () => {
    const callback = vi.fn();
    const element = document.createElement('div');

    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();

    let resizeCallback: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe = observeSpy;
        disconnect = disconnectSpy;
        unobserve = vi.fn();
      },
    );

    const teardown = observeResize(element, callback, 0);

    expect(observeSpy).toHaveBeenCalledWith(element);

    resizeCallback!(
      [{ contentRect: { width: 400, height: 300 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(callback).toHaveBeenCalledWith(400, 300);

    teardown();
    expect(disconnectSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns no-op cleanup when ResizeObserver is undefined (SSR)', () => {
    const original = globalThis.ResizeObserver;
    // @ts-expect-error -- simulating SSR where ResizeObserver does not exist
    delete globalThis.ResizeObserver;

    const callback = vi.fn();
    const element = document.createElement('div');
    const teardown = observeResize(element, callback);

    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();

    globalThis.ResizeObserver = original;
  });

  it('deduplicates unchanged sizes', async () => {
    const callback = vi.fn();
    const element = document.createElement('div');

    let resizeCallback: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
      },
    );

    observeResize(element, callback, 0);

    const entry = { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry;
    resizeCallback!([entry], {} as ResizeObserver);
    await new Promise((r) => setTimeout(r, 10));

    resizeCallback!([entry], {} as ResizeObserver);
    await new Promise((r) => setTimeout(r, 10));

    expect(callback).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
