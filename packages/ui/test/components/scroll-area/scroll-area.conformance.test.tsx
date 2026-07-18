import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScrollArea, ScrollBar } from '../../../src/components/scroll-area/scroll-area';
import { scrollArea } from '../../../src/components/scroll-area/scroll-area.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('scroll-area conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(<ScrollArea>body</ScrollArea>);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(scrollArea, root, {}, { orientation: 'vertical' }, ['root']);
    // The empty projection means no role/aria-* leaks onto the surface.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('defaults to vertical overflow and carries the custom scrollbar', () => {
    render(<ScrollArea data-testid="s">content</ScrollArea>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('overflow-y-auto');
    expect(root.className).toContain('[&::-webkit-scrollbar-thumb]:bg-border');
  });

  it('orientation flips the overflow axis', () => {
    render(<ScrollArea orientation="horizontal">wide</ScrollArea>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('overflow-x-auto');
    expect(root.className).not.toContain('overflow-y-auto');
  });

  it('both is the rafters extension over the shadcn base', () => {
    render(<ScrollArea orientation="both">grid</ScrollArea>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('overflow-auto');
  });

  it('passes children through and stays axe-clean', async () => {
    render(
      <main>
        <ScrollArea className="h-40" data-testid="s">
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        </ScrollArea>
      </main>,
    );
    const root = body().querySelector('[data-testid="s"]') as HTMLElement;
    expect(root.textContent).toContain('One');
    expect(root.textContent).toContain('Two');
    // Only root is a declared part -- children carry none (boundary 5).
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
    await assertAxeClean(body());
  });

  it('consumer className merges via classy', () => {
    render(<ScrollArea className="h-72 border">x</ScrollArea>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).toContain('h-72');
    expect(root.className).toContain('border');
  });

  it('the decorative ScrollBar is a plain wrapper -- classes, thumb, no data-part', () => {
    render(
      <ScrollArea>
        <div>content</div>
        <ScrollBar orientation="horizontal" data-testid="bar" />
      </ScrollArea>,
    );
    const bar = body().querySelector('[data-testid="bar"]') as HTMLElement;
    expect(bar.getAttribute('data-slot')).toBe('scroll-bar');
    expect(bar.getAttribute('data-orientation')).toBe('horizontal');
    expect(bar.className).toContain('h-2.5');
    expect(bar.querySelector('[data-slot="scroll-thumb"]')).not.toBeNull();
    // ScrollBar is decoration, not a declared part.
    expect(bar.getAttribute('data-part')).toBeNull();
  });

  it('has no keyboard contract -- scrolling stays native', () => {
    expect(scrollArea.keymap({ key: 'ArrowDown' }, {}, 'root', {})).toBeNull();
  });
});
