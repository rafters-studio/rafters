/**
 * Astro performance of the Separator score. Separator is a static score -- the
 * role/orientation projection is a pure function of config -- so its Astro file
 * ships NO <script> and there is NO bindSeparator. This test renders the server
 * markup and asserts the one contract a rule carries: the root part, the
 * resolved role/aria-orientation projection, the orientation axis switch, and
 * axe cleanliness. `decorative` is a plain boolean prop default true.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Separator from '../../../src/components/separator/separator.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Separator, { props });
  document.body.innerHTML = `<main><p>Above</p>${html}<p>Below</p></main>`;
  return document.body;
}

describe('separator conformance [astro]', () => {
  it('renders a root rule carrying the shared classes', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('shrink-0');
    expect(root.className).toContain('bg-border');
    expect(root.className).toContain('h-px w-full');
  });

  it('is decorative by default: role="none", no aria-orientation', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('none');
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('opting out projects a semantic separator carrying aria-orientation', async () => {
    const root = partElement(
      await render({ decorative: false, orientation: 'vertical' }),
      'root',
    ) as HTMLElement;
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('orientation flips the visual axis through the same projection', async () => {
    const root = partElement(await render({ orientation: 'vertical' }), 'root') as HTMLElement;
    expect(root.className).toContain('h-full w-px');
    expect(root.className).not.toContain('h-px w-full');
  });

  it('root is the only declared part -- a rule has no content or sub-parts', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('is axe-clean as a decorative rule inside a landmark', async () => {
    await assertAxeClean(await render());
  });

  it('is axe-clean as a semantic separator inside a landmark', async () => {
    await assertAxeClean(await render({ decorative: false }));
  });
});
