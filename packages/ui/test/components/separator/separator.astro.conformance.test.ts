import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Separator from '../../../src/components/separator/separator.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Separator, { props });
  document.body.innerHTML = html;
  return document.body;
}

describe('separator conformance [astro]', () => {
  it('is decorative by default: role="none", no aria-orientation, and axe clean', async () => {
    const body = await render();
    const root = partElement(body, 'root');
    expect(root?.getAttribute('role')).toBe('none');
    expect(root?.hasAttribute('aria-orientation')).toBe(false);
    await assertAxeClean(body);
  });

  it('non-decorative projects the real separator role and orientation', async () => {
    const body = await render({ decorative: false });
    const root = partElement(body, 'root');
    expect(root?.getAttribute('role')).toBe('separator');
    expect(root?.getAttribute('aria-orientation')).toBe('horizontal');
    await assertAxeClean(body);
  });

  it('vertical orientation carries into both the class set and the projection', async () => {
    const body = await render({ decorative: false, orientation: 'vertical' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
    expect(root.className).toContain('h-full w-px');
    await assertAxeClean(body);
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'my-4' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-border');
    expect(root.className).toContain('my-4');
  });
});
