import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Typography from '../../../src/components/typography/typography.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

/** axe's `region` rule wants top-level content inside a landmark; the
 *  specimen itself (a heading, a paragraph) carries none of its own -- same
 *  as any bare fragment. Wrap in the test render, not in the component. */
async function render(props: Record<string, unknown>, slot = 'Specimen'): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Typography, {
    props,
    slots: { default: slot },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('typography conformance [astro]', () => {
  it('the semantic element IS the contract: as drives the tag', async () => {
    const body = await render({ as: 'h2' });
    expect(body.querySelector('h2')).not.toBeNull();
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('h2');
    await assertAxeClean(body);
  });

  it('defaults to p when as is omitted', async () => {
    const body = await render({});
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('p');
  });

  it('h1 carries the raw oracle sizing plus the CQ step-up', async () => {
    const body = await render({ as: 'h1' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('text-4xl');
    expect(root.className).toContain('font-bold');
    expect(root.className).toContain('@lg:text-5xl');
    await assertAxeClean(body);
  });

  it('h5/h6 share h4 visual treatment (oracle parity)', async () => {
    const h4 = await render({ as: 'h4' });
    const h6 = await render({ as: 'h6' });
    const h4Root = partElement(h4, 'root') as HTMLElement;
    const h6Root = partElement(h6, 'root') as HTMLElement;
    expect(h6Root.className).toBe(h4Root.className);
    expect(h6Root.tagName.toLowerCase()).toBe('h6');
  });

  it('token props override variant defaults, not fight them', async () => {
    const body = await render({ as: 'p', size: 'xl', color: 'muted-foreground' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('text-xl');
    expect(root.className).toContain('text-muted-foreground');
    expect(root.className).not.toContain('text-foreground');
  });

  it('color is a fill signature over the text context', async () => {
    const body = await render({ as: 'small', color: 'primary' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('text-primary');
  });

  it('list variants render raw li children with spacing applied', async () => {
    const body = await render({ as: 'ul' }, '<li>First</li><li>Second</li>');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('ul');
    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.className).toContain('list-disc');
  });

  it('ordered list uses ol and decimal styling', async () => {
    const body = await render({ as: 'ol' }, '<li>First</li>');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('ol');
    expect(root.className).toContain('list-decimal');
  });

  it('blockquote citation renders a trailing cite, static (no editing)', async () => {
    const body = await render({ as: 'blockquote', citation: 'Steve Jobs' });
    const root = partElement(body, 'root') as HTMLElement;
    const cite = root.querySelector('cite');
    expect(cite).not.toBeNull();
    expect(cite?.textContent).toBe('Steve Jobs');
    await assertAxeClean(body);
  });

  it('citation is a no-op on non-blockquote elements', async () => {
    const body = await render({ as: 'p', citation: 'ignored' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.querySelector('cite')).toBeNull();
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ as: 'p', class: 'mb-0' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('mb-0');
    expect(root.className).toContain('leading-7');
  });
});
