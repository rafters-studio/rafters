/**
 * React performance of the ScrollArea score, run in a real browser
 * (@vitest/browser-playwright). ScrollArea is a pure static -- no state, no
 * actions, no keymap -- so its contract is: the root part renders, its ARIA
 * projection is empty (native scroll owns every semantic), the shared classes
 * land, and only `root` is a declared part (children carry none).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ScrollArea, ScrollBar } from '../../../src/components/scroll-area/scroll-area';
import { scrollArea } from '../../../src/components/scroll-area/scroll-area.behavior';

function root(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-part="root"]');
  if (!el) throw new Error('no [data-part="root"] rendered');
  return el;
}

describe('scroll-area [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', async () => {
    const { container } = await render(<ScrollArea>body</ScrollArea>);
    const el = root(container);
    expect(el.getAttribute('data-part')).toBe('root');
    // The empty projection means no role/aria-* leaks onto the surface.
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('defaults to vertical overflow and carries the custom scrollbar', async () => {
    const { container } = await render(<ScrollArea data-testid="s">content</ScrollArea>);
    const el = root(container);
    expect(el.className).toContain('overflow-y-auto');
    expect(el.className).toContain('[&::-webkit-scrollbar-thumb]:bg-border');
  });

  it('orientation flips the overflow axis', async () => {
    const { container } = await render(<ScrollArea orientation="horizontal">wide</ScrollArea>);
    const el = root(container);
    expect(el.className).toContain('overflow-x-auto');
    expect(el.className).not.toContain('overflow-y-auto');
  });

  it('both is the rafters extension over the shadcn base', async () => {
    const { container } = await render(<ScrollArea orientation="both">grid</ScrollArea>);
    const el = root(container);
    expect(el.className).toContain('overflow-auto');
  });

  it('passes children through, keeping root the only declared part', async () => {
    const { container } = await render(
      <main>
        <ScrollArea className="h-40" data-testid="s">
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        </ScrollArea>
      </main>,
    );
    const el = root(container);
    expect(el.textContent).toContain('One');
    expect(el.textContent).toContain('Two');
    // Only root is a declared part -- children carry none (boundary 5).
    expect(el.getAttribute('data-part')).toBe('root');
    expect(el.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('consumer className merges via classy', async () => {
    const { container } = await render(<ScrollArea className="h-72 border">x</ScrollArea>);
    const el = root(container);
    expect(el.className).toContain('h-full');
    expect(el.className).toContain('h-72');
    expect(el.className).toContain('border');
  });

  it('the decorative ScrollBar is a plain wrapper -- classes, thumb, no data-part', async () => {
    const { container } = await render(
      <ScrollArea>
        <div>content</div>
        <ScrollBar orientation="horizontal" data-testid="bar" />
      </ScrollArea>,
    );
    const bar = container.querySelector<HTMLElement>('[data-testid="bar"]');
    if (!bar) throw new Error('no [data-testid="bar"] rendered');
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
