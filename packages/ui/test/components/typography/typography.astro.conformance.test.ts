import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Typography from '../../../src/components/typography/typography.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>, slot = 'content'): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Typography, {
    props,
    slots: { default: slot },
  });
  // Wrap in a landmark so bare text is not flagged by the axe region rule.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('typography conformance [astro]', () => {
  it('as chooses the element and derives the variant; data-part root is present', async () => {
    const body = await render({ as: 'h1' }, 'Title');
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('h1');
    expect(root?.className).toContain('text-4xl');
    expect(root?.className).toContain('@lg:text-5xl');
    await assertAxeClean(body);
  });

  it('h5 renders its own tag but borrows h4 scale', async () => {
    const body = await render({ as: 'h5' }, 'Sub');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('h5');
    expect(root.className).toContain('text-xl');
  });

  it('span reads as body text', async () => {
    const body = await render({ as: 'span' }, 'inline');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('span');
    expect(root.className).toContain('leading-7');
  });

  it('an explicit variant overrides the element-derived one', async () => {
    const body = await render({ as: 'p', variant: 'lead' }, 'intro');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('p');
    expect(root.className).toContain('text-xl');
  });

  it('token props override the variant default', async () => {
    const body = await render({ as: 'h1', size: '2xl' }, 'Title');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('text-2xl');
    expect(root.className).not.toContain('text-4xl');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ as: 'p', class: 'max-w-prose' }, 'x');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('leading-7');
    expect(root.className).toContain('max-w-prose');
  });
});
