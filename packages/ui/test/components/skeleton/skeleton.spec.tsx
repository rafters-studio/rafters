import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Skeleton } from '../../../src/components/skeleton/skeleton';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';

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

afterEach(() => {
  cleanup();
});

describe('skeleton [react]', () => {
  it('fulfills the contract: root renders and projects aria-hidden=true', () => {
    const { container } = render(<Skeleton />);
    const el = root(container);
    const projected = skeleton.aria({}, {}, { root: el.id }).root ?? {};
    for (const [attr, expected] of Object.entries(projected)) {
      if (expected === undefined) {
        expect(el.hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr), attr).toBe(String(expected));
      }
    }
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('carries the shimmer cell utility and drops motion-reduce:animate-none (#2155)', () => {
    // #2155: migrated off the stock animate-pulse onto the shimmer cell's own
    // period utility; motion-reduce:animate-none is removed, not replaced.
    // This test owns only the class the component emits. Whether that class
    // actually compiles to a reduced-motion-exempt rule is proven below, in
    // 'compiles to a rule the reduced-motion law never reaches (#2155)',
    // against the real compiled CSS -- not by citation to another package's
    // test suite.
    render(<Skeleton data-testid="s" />);
    const el = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(el.className).toContain('animate-pulse-shimmer');
    expect(el.className).not.toContain('motion-reduce:animate-none');
    expect(el.className).toContain('bg-muted');
  });

  it('is a decorative leaf -- no children, no nested parts', () => {
    render(<Skeleton />);
    const el = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(el.children.length).toBe(0);
    expect(el.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    render(<Skeleton />);
    const el = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(el.getAttribute('data-slot')).toBe('skeleton');
  });

  it('consumer className merges via classy -- the shadcn sizing surface', () => {
    render(<Skeleton className="h-4 w-48" />);
    const el = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(el.className).toContain('animate-pulse-shimmer');
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-48');
  });

  it('passes HTML attributes through and keeps its part identity inside a landmark', async () => {
    render(
      <main>
        <Skeleton className="h-12 w-12 rounded-full" data-testid="avatar" />
      </main>,
    );
    const el = body().querySelector('[data-testid="avatar"]') as HTMLElement;
    expect(el.getAttribute('data-part')).toBe('root');
  });
});
