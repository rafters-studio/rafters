import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Card from '../../../src/components/card/card.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown>,
  slots: Record<string, string> = { content: 'Post excerpt.' },
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Card, { props, slots });
  // A card is a content surface, not a page landmark (Spec 00 -- Container
  // owns landmarks); axe's "region" rule expects body content inside one,
  // so tests wrap the render the way a real page would, in <main>.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('card conformance [astro]', () => {
  it('the semantic element IS the contract: as drives the surface element', async () => {
    const body = await render({ as: 'article' });
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('article');
    await assertAxeClean(body);
  });

  it('defaults to a div when as is omitted', async () => {
    const body = await render({});
    expect(partElement(body, 'root')?.tagName.toLowerCase()).toBe('div');
  });

  it('title and description compose inside one header part', async () => {
    const body = await render({}, { title: 'Blog Post Title', description: 'Published Jan 2025' });
    const header = partElement(body, 'header');
    expect(header).not.toBeNull();
    const title = partElement(body, 'title');
    expect(title?.tagName.toLowerCase()).toBe('h3');
    expect(title?.textContent?.trim()).toBe('Blog Post Title');
    expect(header?.contains(title)).toBe(true);
    const description = partElement(body, 'description');
    expect(description?.tagName.toLowerCase()).toBe('p');
    expect(header?.contains(description)).toBe(true);
    await assertAxeClean(body);
  });

  it('header is absent when no title, description, or header slot is passed', async () => {
    const body = await render({});
    expect(partElement(body, 'header')).toBeNull();
    expect(partElement(body, 'title')).toBeNull();
    expect(partElement(body, 'description')).toBeNull();
  });

  it('title alone renders a header without a description part', async () => {
    const body = await render({}, { title: 'Solo title' });
    expect(partElement(body, 'header')).not.toBeNull();
    expect(partElement(body, 'title')).not.toBeNull();
    expect(partElement(body, 'description')).toBeNull();
  });

  it('content and footer are optional parts, present only when slotted', async () => {
    const withBoth = await render({}, { content: 'Excerpt.', footer: 'Read more' });
    expect(partElement(withBoth, 'content')?.textContent?.trim()).toBe('Excerpt.');
    expect(partElement(withBoth, 'footer')?.textContent?.trim()).toBe('Read more');

    const withNeither = await render({}, {});
    expect(partElement(withNeither, 'content')).toBeNull();
    expect(partElement(withNeither, 'footer')).toBeNull();
  });

  it('fill signature resolves surface + paired foreground on root', async () => {
    const body = await render({ fill: 'primary' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('text-primary-foreground');
    expect(root.getAttribute('data-fill')).toBe('primary');
  });

  it('consumer class merges via classy alongside the base surface', async () => {
    const body = await render({ class: 'max-w-sm' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-card');
    expect(root.className).toContain('max-w-sm');
  });

  it('bare unnamed children fold into content, oracle-parity for <Card>text</Card>', async () => {
    const body = await render({}, { default: 'Just text, no named slots.' });
    const content = partElement(body, 'content');
    expect(content).not.toBeNull();
    expect(content?.textContent?.trim()).toBe('Just text, no named slots.');
  });

  it('titleAs picks the heading level, oracle CardTitle "as" parity', async () => {
    const body = await render({ titleAs: 'h1' }, { title: 'Page-level heading' });
    const title = partElement(body, 'title');
    expect(title?.tagName.toLowerCase()).toBe('h1');
  });
});
