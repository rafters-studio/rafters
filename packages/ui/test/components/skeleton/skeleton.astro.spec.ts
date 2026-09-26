/**
 * Astro performance of the Skeleton score. Skeleton is a PURE STATIC -- the
 * score holds no state and runs no effects -- so its Astro file ships NO
 * <script> and there is NO bindSkeleton. This test renders the server markup
 * and asserts the one contract a decorative placeholder carries: the root with
 * the shared classes and a constant aria-hidden, and a leaf with no children.
 * One score, three performances; here it is markup + classes, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Skeleton from '../../../src/components/skeleton/skeleton.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Skeleton, { props });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

function root(body: HTMLElement): HTMLElement {
  const el = body.querySelector<HTMLElement>('[data-part="root"]');
  if (!el) throw new Error('no [data-part="root"] rendered');
  return el;
}

describe('skeleton [astro]', () => {
  it('renders a root placeholder carrying the shared classes', async () => {
    const el = root(await render());
    expect(el).not.toBeNull();
    expect(el.className).toContain('animate-pulse-shimmer');
    expect(el.className).not.toContain('motion-reduce:animate-none');
    expect(el.className).toContain('bg-muted');
  });

  it('projects the constant aria-hidden through the same score', async () => {
    const el = root(await render());
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a decorative leaf -- no children, one declared part', async () => {
    const body = await render();
    const el = root(body);
    expect(el.children.length).toBe(0);
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('carries the shadcn data-slot for drop-in parity', async () => {
    const el = root(await render());
    expect(el.getAttribute('data-slot')).toBe('skeleton');
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const el = root(await render({ class: 'h-4 w-48' }));
    expect(el.className).toContain('animate-pulse-shimmer');
    expect(el.className).not.toContain('h-4');
    expect(el.className).not.toContain('w-48');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
