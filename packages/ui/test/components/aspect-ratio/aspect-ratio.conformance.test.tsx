import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio';
import { aspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

/**
 * The painted proportion, normalised. A single-number `aspect-ratio` is the CSS
 * ratio `n / 1`, and the DOM serialises it that way; strip the `/ 1` so the
 * assertion reads the bare proportion the score resolved.
 */
function paintedRatio(el: HTMLElement): string {
  return el.style.getPropertyValue('aspect-ratio').replace(/\s*\/\s*1$/, '');
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
    assertContractFulfillment(aspectRatio, root, {}, {}, ['root']);
    // The empty projection means no role/aria-* leaks onto the box.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
    expect(root.className).toContain('relative w-full');
  });

  it('defaults to a square: an absent ratio paints aspect-ratio 1', () => {
    render(<AspectRatio data-testid="ar">x</AspectRatio>);
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBe('1');
  });

  it('paints the supplied ratio through the one inline style channel, unitless', () => {
    render(
      <AspectRatio ratio={16 / 9} data-testid="ar">
        x
      </AspectRatio>,
    );
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBe(String(16 / 9));
    expect(paintedRatio(root)).not.toContain('px');
  });

  it('merges consumer style without dropping the ratio', () => {
    render(
      <AspectRatio ratio={4 / 3} style={{ maxWidth: '20rem' }} data-testid="ar">
        x
      </AspectRatio>,
    );
    const root = body().querySelector('[data-testid="ar"]') as HTMLElement;
    expect(paintedRatio(root)).toBe(String(4 / 3));
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

  it('is axe-clean: the box is a layout utility, its content carries semantics', async () => {
    render(
      <main>
        <AspectRatio ratio={16 / 9}>
          <img src="/photo.jpg" alt="A descriptive alt" />
        </AspectRatio>
      </main>,
    );
    await assertAxeClean(body());
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(aspectRatio.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
