import { describe, expect, it } from 'vitest';
import { computePosition } from './collision-detector';

/**
 * A floating element whose measured size is fixed, so base-position math is
 * deterministic regardless of the happy-dom layout (which reports zeros).
 */
function makeFloating(width: number, height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
  return el;
}

describe('computePosition anchor kinds', () => {
  it('accepts a point anchor as a zero-size rect', () => {
    const floating = makeFloating(50, 20);

    const result = computePosition({ x: 100, y: 100 }, floating, {
      side: 'bottom',
      align: 'center',
      avoidCollisions: false,
    });

    // bottom of a zero-height point is its y; center aligns 100 - 50/2.
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

    // bottom = 50 + 30; center = 200 + 40/2 - 50/2.
    expect(result.x).toBe(195);
    expect(result.y).toBe(80);
  });

  it('resolves an HTMLElement identically to its matching DOMRect (backward compatible)', () => {
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
