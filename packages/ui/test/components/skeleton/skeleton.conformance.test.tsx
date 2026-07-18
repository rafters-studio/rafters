import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Skeleton } from '../../../src/components/skeleton/skeleton';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('skeleton conformance [react]', () => {
  it('fulfills the contract: root renders and projects aria-hidden=true', () => {
    const { container } = render(<Skeleton />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(skeleton, root, {}, {}, ['root']);
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('carries the pulse shimmer and reduced-motion opt-out', () => {
    render(<Skeleton data-testid="s" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-pulse');
    expect(root.className).toContain('motion-reduce:animate-none');
    expect(root.className).toContain('bg-muted');
  });

  it('is a decorative leaf -- no children, no nested parts', () => {
    render(<Skeleton />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.children.length).toBe(0);
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    render(<Skeleton />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('skeleton');
  });

  it('consumer className merges via classy -- the shadcn sizing surface', () => {
    render(<Skeleton className="h-4 w-48" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-pulse');
    expect(root.className).toContain('h-4');
    expect(root.className).toContain('w-48');
  });

  it('passes HTML attributes through and stays axe-clean inside a landmark', async () => {
    render(
      <main>
        <Skeleton className="h-12 w-12 rounded-full" data-testid="avatar" />
      </main>,
    );
    const root = body().querySelector('[data-testid="avatar"]') as HTMLElement;
    expect(root.getAttribute('data-part')).toBe('root');
    await assertAxeClean(body());
  });
});
