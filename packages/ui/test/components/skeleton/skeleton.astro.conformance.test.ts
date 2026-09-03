/**
 * Astro performance of the Skeleton score. Skeleton is a PURE STATIC -- the
 * score holds no state and runs no effects -- so its Astro file ships NO
 * <script> and there is NO bindSkeleton. This test renders the server markup
 * and asserts the one contract a decorative placeholder carries: the root with
 * the shared classes and a constant aria-hidden, a leaf with no children, and
 * axe cleanliness. One score, three performances; here it is markup + classes,
 * nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
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

describe('skeleton conformance [astro]', () => {
  it('renders a root placeholder carrying the shared classes', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('animate-pulse-shimmer');
    expect(root.className).not.toContain('motion-reduce:animate-none');
    expect(root.className).toContain('bg-muted');
  });

  it('projects the constant aria-hidden through the same score', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a decorative leaf -- no children, one declared part', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.children.length).toBe(0);
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('carries the shadcn data-slot for drop-in parity', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('skeleton');
  });

  it('merges a consumer class through the same projection', async () => {
    const body = await render({ class: 'h-4 w-48' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('animate-pulse-shimmer');
    expect(root.className).toContain('h-4');
    expect(root.className).toContain('w-48');
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render();
    await assertAxeClean(body);
  });
});
