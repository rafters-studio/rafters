/**
 * React performance of the AspectRatio score. AspectRatio is a PURE STATIC --
 * the score projects no ARIA, holds no state, runs no effects. Proves the
 * empty projection, presence of the one declared part, the ratio painted on
 * the inline style channel, and the classes channel (base + consumer
 * className merge).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio';
import { aspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio.behavior';

const body = () => document.body;

function partElement(root: ParentNode, part: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/**
 * The painted proportion, normalised to a number. A single-number
 * `aspect-ratio` is the CSS ratio `n / 1`, and the DOM serialises it that
 * way; strip the `/ 1` and parse so the assertion reads the bare proportion
 * the score resolved. A real browser's CSSOM (unlike happy-dom) round-trips
 * the value through a limited-precision serialization, so the comparison is
 * numeric rather than a string match.
 */
function paintedRatio(el: HTMLElement): number {
  return Number(el.style.getPropertyValue('aspect-ratio').replace(/\s*\/\s*1$/, ''));
}

afterEach(() => {
  cleanup();
});

describe('aspect-ratio conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(
      <AspectRatio>
        <img src="/photo.jpg" alt="Photo" />
      </AspectRatio>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    const projection = aspectRatio.aria({}, {}, { root: root.id });
    expect(projection.root).toEqual({});
    // The empty projection means no role/aria-* leaks onto the box.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
    expect(root.className).toContain('relative w-full');
  });

  it('defaults to a square: an absent ratio paints aspect-ratio 1', () => {
    render(<AspectRatio data-testid="ar">x</AspectRatio>);
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBe(1);
  });

  it('paints the supplied ratio through the one inline style channel, unitless', () => {
    render(
      <AspectRatio ratio={16 / 9} data-testid="ar">
        x
      </AspectRatio>,
    );
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBeCloseTo(16 / 9, 4);
    expect(root.style.getPropertyValue('aspect-ratio')).not.toContain('px');
  });

  it('merges consumer style without dropping the ratio', () => {
    render(
      <AspectRatio ratio={4 / 3} style={{ maxWidth: '20rem' }} data-testid="ar">
        x
      </AspectRatio>,
    );
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBeCloseTo(4 / 3, 4);
    expect(root.style.maxWidth).toBe('20rem');
  });

  it('consumer className merges via classy', () => {
    render(
      <AspectRatio className="rounded-lg" data-testid="ar">
        x
      </AspectRatio>,
    );
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(root.className).toContain('relative w-full');
    expect(root.className).toContain('rounded-lg');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(aspectRatio.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
