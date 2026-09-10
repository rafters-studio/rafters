/**
 * React performance of the Separator score. Separator is a static score
 * (no state, no actions, no keymap) whose role/aria-orientation projection is
 * a pure function of config -- the one real contract this suite asserts.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Separator } from '../../../src/components/separator/separator';
import { separator } from '../../../src/components/separator/separator.behavior';

const body = () => document.body;

/** The element carrying data-part="root". */
function root(container: HTMLElement): HTMLElement {
  const el =
    container.getAttribute('data-part') === 'root'
      ? container
      : container.querySelector<HTMLElement>('[data-part="root"]');
  if (!el) throw new Error('no [data-part="root"] rendered');
  return el;
}

/** Asserts the rendered role/aria-orientation equal the score's projection
 *  for `root` -- including absence: a projected undefined attr must not
 *  render. */
function assertAria(el: HTMLElement, config: Parameters<typeof separator.aria>[1]): void {
  const projected = separator.aria({}, config, { root: el.id }).root ?? {};
  for (const [attr, expected] of Object.entries(projected)) {
    if (expected === undefined) {
      expect(el.hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
    } else {
      expect(el.getAttribute(attr), attr).toBe(String(expected));
    }
  }
}

afterEach(() => {
  cleanup();
});

describe('separator [react]', () => {
  it('fulfills the contract by default: decorative rule projects role="none"', () => {
    const { container } = render(<Separator />);
    const el = root(container);
    assertAria(el, { orientation: 'horizontal', decorative: true });
    expect(el.getAttribute('role')).toBe('none');
    // A decorative rule announces no orientation.
    expect(el.hasAttribute('aria-orientation')).toBe(false);
  });

  it('opting out projects a semantic separator carrying aria-orientation', () => {
    const { container } = render(<Separator decorative={false} orientation="vertical" />);
    const el = root(container);
    assertAria(el, { orientation: 'vertical', decorative: false });
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('defaults to a horizontal rule and flips axis on orientation', () => {
    const { rerender, container } = render(<Separator />);
    let el = root(container);
    expect(el.className).toContain('h-px w-full');
    rerender(<Separator orientation="vertical" />);
    el = root(container);
    expect(el.className).toContain('h-full w-px');
    expect(el.className).not.toContain('h-px w-full');
  });

  it('consumer className merges via classy', () => {
    render(<Separator className="my-4" />);
    const el = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(el.className).toContain('bg-border');
    expect(el.className).toContain('my-4');
  });
});
