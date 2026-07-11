import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import AspectRatio from '../../../src/components/aspect-ratio/aspect-ratio.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>, slot = 'content'): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(AspectRatio, {
    props,
    slots: { default: slot },
  });
  // AspectRatio is content, not a landmark (like grid.md's "silent
  // furniture") -- wrap in <main> so axe's region rule doesn't fire on a
  // bare div at document.body root, matching grid.astro.conformance.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('aspect-ratio conformance [astro]', () => {
  it('defaults to a square ratio', async () => {
    const body = await render({});
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('style')).toContain('aspect-ratio: 1');
    await assertAxeClean(body);
  });

  it('ratio rides the one narrow style channel, not a class', async () => {
    const body = await render({ ratio: 16 / 9 });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('style')).toContain(`aspect-ratio: ${16 / 9}`);
    expect(root.className).not.toMatch(/aspect-\[/);
  });

  it('slotted content fills the box (content carries its own semantics)', async () => {
    const body = await render({}, '<img src="/photo.jpg" alt="Photo" />');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.querySelector('img')).not.toBeNull();
    await assertAxeClean(body);
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'rounded-lg' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full');
    expect(root.className).toContain('rounded-lg');
  });

  it('passthrough attrs land on the root', async () => {
    const body = await render({ 'data-testid': 'hero-ratio' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('hero-ratio');
  });
});
