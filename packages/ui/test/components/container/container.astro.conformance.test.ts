import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Container from '../../../src/components/container/container.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>, slot = 'content'): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Container, {
    props,
    slots: { default: slot },
  });
  document.body.innerHTML = html;
  return document.body;
}

describe('container conformance [astro]', () => {
  it('the semantic element IS the contract: as drives the landmark', async () => {
    const body = await render({ as: 'main', size: '6xl' });
    expect(body.querySelector('main')).not.toBeNull();
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('main');
    await assertAxeClean(body);
  });

  it('aside carries a passed-through aria-label (no server-side aria projection)', async () => {
    const body = await render({ as: 'aside', 'aria-label': 'Related' });
    expect(body.querySelector('aside')?.getAttribute('aria-label')).toBe('Related');
  });

  it('one tag, container and grid: columns puts children on the grid', async () => {
    const body = await render({ as: 'section', size: '6xl', columns: 3, gap: '6' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('grid grid-cols-3');
    expect(root.className).toContain('max-w-6xl');
  });

  it('queryName lands as containerName style -- the one style channel', async () => {
    const body = await render({ queryName: 'rail' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.style.containerName).toBe('rail');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'min-h-screen' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('@container');
    expect(root.className).toContain('min-h-screen');
  });
});
