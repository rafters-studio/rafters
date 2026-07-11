import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Skeleton from '../../../src/components/skeleton/skeleton.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Skeleton, { props });
  // A bare aria-hidden div is content-less furniture, not a landmark;
  // wrap it the same way grid's conformance test wraps layout furniture
  // so axe's region rule has something to judge instead of the placeholder.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('skeleton conformance [astro]', () => {
  it('renders one part, always aria-hidden, and passes axe clean', async () => {
    const body = await render();
    const root = partElement(body, 'root');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    await assertAxeClean(body);
  });

  it('the default variant carries the muted surface class', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('animate-pulse');
  });

  it('variant selects the subtle surface and stays aria-hidden', async () => {
    const body = await render({ variant: 'destructive' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-destructive-subtle');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    await assertAxeClean(body);
  });

  it('consumer class merges via classy; no children accepted', async () => {
    const body = await render({ class: 'h-4 w-48' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('h-4 w-48');
    expect(root.childNodes.length).toBe(0);
  });
});
