import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPosition,
  autoPosition,
  computePosition,
  getAvailableSpace,
} from '../../src/primitives/collision-detector';

describe('computePosition', () => {
  let anchor: HTMLDivElement;
  let floating: HTMLDivElement;

  function createMockElement(rect: Partial<DOMRect>): HTMLDivElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    });
    return el;
  }

  beforeEach(() => {
    // Create anchor with mock rect
    anchor = createMockElement({
      top: 100,
      right: 200,
      bottom: 150,
      left: 100,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
    });

    // Create floating with mock rect
    floating = createMockElement({
      top: 0,
      right: 80,
      bottom: 40,
      left: 0,
      width: 80,
      height: 40,
      x: 0,
      y: 0,
    });

    document.body.appendChild(anchor);
    document.body.appendChild(floating);
  });

  afterEach(() => {
    anchor.remove();
    floating.remove();
  });

  it('positions below anchor by default', () => {
    const result = computePosition(anchor, floating);

    expect(result.side).toBe('bottom');
    expect(result.y).toBe(150); // anchor.bottom
  });

  it('positions above anchor when side is top', () => {
    const result = computePosition(anchor, floating, { side: 'top' });

    expect(result.side).toBe('top');
    expect(result.y).toBe(60); // anchor.top - floating.height
  });

  it('positions to the right of anchor', () => {
    const result = computePosition(anchor, floating, { side: 'right' });

    expect(result.side).toBe('right');
    expect(result.x).toBe(200); // anchor.right
  });

  it('positions to the left of anchor', () => {
    const result = computePosition(anchor, floating, { side: 'left' });

    expect(result.side).toBe('left');
    expect(result.x).toBe(20); // anchor.left - floating.width
  });

  it('aligns to start', () => {
    const result = computePosition(anchor, floating, {
      side: 'bottom',
      align: 'start',
    });

    expect(result.align).toBe('start');
    expect(result.x).toBe(100); // anchor.left
  });

  it('aligns to center', () => {
    const result = computePosition(anchor, floating, {
      side: 'bottom',
      align: 'center',
    });

    expect(result.align).toBe('center');
    // anchor.left + anchor.width/2 - floating.width/2
    expect(result.x).toBe(110);
  });

  it('aligns to end', () => {
    const result = computePosition(anchor, floating, {
      side: 'bottom',
      align: 'end',
    });

    expect(result.align).toBe('end');
    expect(result.x).toBe(120); // anchor.right - floating.width
  });

  it('applies side offset', () => {
    const result = computePosition(anchor, floating, {
      side: 'bottom',
      sideOffset: 10,
    });

    expect(result.y).toBe(160); // anchor.bottom + offset
  });

  it('applies align offset', () => {
    const result = computePosition(anchor, floating, {
      side: 'bottom',
      align: 'start',
      alignOffset: 5,
    });

    expect(result.x).toBe(105); // anchor.left + offset
  });

  it('flips to opposite side on collision', () => {
    // Create anchor near bottom of viewport
    const bottomAnchor = createMockElement({
      top: 700,
      right: 200,
      bottom: 750,
      left: 100,
      width: 100,
      height: 50,
      x: 100,
      y: 700,
    });
    document.body.appendChild(bottomAnchor);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true,
      configurable: true,
    });

    const result = computePosition(bottomAnchor, floating, {
      side: 'bottom',
      avoidCollisions: true,
      collisionPadding: 10,
    });

    // Should flip to top since bottom would overflow
    expect(result.side).toBe('top');
    expect(result.hasCollision).toBe(true);

    bottomAnchor.remove();
  });

  it('reports no collision when within bounds', () => {
    const result = computePosition(anchor, floating, {
      avoidCollisions: true,
    });

    expect(result.hasCollision).toBe(false);
  });

  it('returns collision details', () => {
    // Create anchor near edges
    const edgeAnchor = createMockElement({
      top: 5,
      right: 50,
      bottom: 55,
      left: 5,
      width: 45,
      height: 50,
      x: 5,
      y: 5,
    });
    document.body.appendChild(edgeAnchor);

    const result = computePosition(edgeAnchor, floating, {
      side: 'top',
      avoidCollisions: false,
    });

    expect(result.collisions).toHaveProperty('top');
    expect(result.collisions).toHaveProperty('right');
    expect(result.collisions).toHaveProperty('bottom');
    expect(result.collisions).toHaveProperty('left');

    edgeAnchor.remove();
  });

  it('uses custom collision boundary', () => {
    const boundary = createMockElement({
      top: 50,
      right: 300,
      bottom: 200,
      left: 50,
      width: 250,
      height: 150,
      x: 50,
      y: 50,
    });
    document.body.appendChild(boundary);

    const result = computePosition(anchor, floating, {
      collisionBoundary: boundary,
      avoidCollisions: true,
    });

    expect(result).toBeDefined();

    boundary.remove();
  });

  it('returns sensible defaults in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const result = computePosition(anchor, floating);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.side).toBe('bottom');
    expect(result.align).toBe('center');
    expect(result.hasCollision).toBe(false);

    globalThis.window = originalWindow;
  });
});

describe('applyPosition', () => {
  let anchor: HTMLDivElement;
  let floating: HTMLDivElement;

  function createMockElement(rect: Partial<DOMRect>): HTMLDivElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    });
    return el;
  }

  beforeEach(() => {
    anchor = createMockElement({
      top: 100,
      right: 200,
      bottom: 150,
      left: 100,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
    });

    floating = createMockElement({
      top: 0,
      right: 80,
      bottom: 40,
      left: 0,
      width: 80,
      height: 40,
      x: 0,
      y: 0,
    });

    document.body.appendChild(anchor);
    document.body.appendChild(floating);
  });

  afterEach(() => {
    anchor.remove();
    floating.remove();
  });

  it('applies position styles to floating element', () => {
    applyPosition(anchor, floating);

    expect(floating.style.position).toBe('absolute');
    expect(floating.style.left).toBe('0px');
    expect(floating.style.top).toBe('0px');
    expect(floating.style.transform).toContain('translate');
  });

  it('sets data attributes for styling', () => {
    applyPosition(anchor, floating, { side: 'bottom', align: 'start' });

    expect(floating.getAttribute('data-side')).toBe('bottom');
    expect(floating.getAttribute('data-align')).toBe('start');
  });

  it('returns position result', () => {
    const result = applyPosition(anchor, floating);

    expect(result).toHaveProperty('x');
    expect(result).toHaveProperty('y');
    expect(result).toHaveProperty('side');
    expect(result).toHaveProperty('align');
  });
});

describe('autoPosition', () => {
  let anchor: HTMLDivElement;
  let floating: HTMLDivElement;

  function createMockElement(rect: Partial<DOMRect>): HTMLDivElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    });
    return el;
  }

  beforeEach(() => {
    anchor = createMockElement({
      top: 100,
      right: 200,
      bottom: 150,
      left: 100,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
    });

    floating = createMockElement({
      top: 0,
      right: 80,
      bottom: 40,
      left: 0,
      width: 80,
      height: 40,
      x: 0,
      y: 0,
    });

    document.body.appendChild(anchor);
    document.body.appendChild(floating);
  });

  afterEach(() => {
    anchor.remove();
    floating.remove();
  });

  it('returns cleanup function', () => {
    const cleanup = autoPosition(anchor, floating);

    expect(cleanup).toBeInstanceOf(Function);

    cleanup();
  });

  it('applies initial position', () => {
    const cleanup = autoPosition(anchor, floating);

    expect(floating.style.position).toBe('absolute');

    cleanup();
  });

  it('removes listeners on cleanup', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const cleanup = autoPosition(anchor, floating);
    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalled();

    removeEventListenerSpy.mockRestore();
  });

  it('returns no-op cleanup in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const cleanup = autoPosition(anchor, floating);
    expect(cleanup).toBeInstanceOf(Function);

    globalThis.window = originalWindow;
  });
});

describe('getAvailableSpace', () => {
  let anchor: HTMLDivElement;

  function createMockElement(rect: Partial<DOMRect>): HTMLDivElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    });
    return el;
  }

  beforeEach(() => {
    anchor = createMockElement({
      top: 100,
      right: 200,
      bottom: 150,
      left: 100,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
    });

    document.body.appendChild(anchor);

    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', {
      value: 600,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    anchor.remove();
  });

  it('returns space on each side', () => {
    const space = getAvailableSpace(anchor);

    expect(space.top).toBe(100); // anchor.top - viewport.top
    expect(space.right).toBe(600); // viewport.right - anchor.right
    expect(space.bottom).toBe(450); // viewport.bottom - anchor.bottom
    expect(space.left).toBe(100); // anchor.left - viewport.left
  });

  it('uses custom boundary', () => {
    const boundary = createMockElement({
      top: 50,
      right: 400,
      bottom: 300,
      left: 50,
      width: 350,
      height: 250,
      x: 50,
      y: 50,
    });
    document.body.appendChild(boundary);

    const space = getAvailableSpace(anchor, boundary);

    expect(space.top).toBe(50); // anchor.top - boundary.top
    expect(space.right).toBe(200); // boundary.right - anchor.right
    expect(space.bottom).toBe(150); // boundary.bottom - anchor.bottom
    expect(space.left).toBe(50); // anchor.left - boundary.left

    boundary.remove();
  });

  it('returns zeros in SSR environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR
    delete globalThis.window;

    const space = getAvailableSpace(anchor);

    expect(space).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });

    globalThis.window = originalWindow;
  });
});

describe('computePosition anchor kinds', () => {
  function makeFloating(width: number, height: number): HTMLElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
    return el;
  }

  it('accepts a point anchor as a zero-size rect', () => {
    const floating = makeFloating(50, 20);

    const result = computePosition({ x: 100, y: 100 }, floating, {
      side: 'bottom',
      align: 'center',
      avoidCollisions: false,
    });

    expect(result.x).toBe(75);
    expect(result.y).toBe(100);
  });

  it('accepts a DOMRect anchor directly (size is honored, not zeroed)', () => {
    const floating = makeFloating(50, 20);

    const result = computePosition(new DOMRect(200, 50, 40, 30), floating, {
      side: 'bottom',
      align: 'center',
      avoidCollisions: false,
    });

    expect(result.x).toBe(195);
    expect(result.y).toBe(80);
  });

  it('resolves an HTMLElement identically to its matching DOMRect', () => {
    const floating = makeFloating(50, 20);
    const rect = new DOMRect(200, 50, 40, 30);
    const anchorEl = document.createElement('div');
    anchorEl.getBoundingClientRect = () => rect;

    const fromElement = computePosition(anchorEl, floating, {
      side: 'bottom',
      align: 'center',
      avoidCollisions: false,
    });
    const fromRect = computePosition(rect, floating, {
      side: 'bottom',
      align: 'center',
      avoidCollisions: false,
    });

    expect(fromRect.x).toBe(fromElement.x);
    expect(fromRect.y).toBe(fromElement.y);
  });
});
