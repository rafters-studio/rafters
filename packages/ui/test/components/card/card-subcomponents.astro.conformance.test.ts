/**
 * The Astro sub-component files are the DROP-IN PARITY SURFACE: an Astro tree
 * has to compose exactly like the React tree --
 *
 *   <Card><CardHeader><CardTitle/><CardAction/></CardHeader><CardContent/></Card>
 *
 * -- with each part importable on its own from
 * `@/components/ui/card-header.astro` and siblings. card.astro's named slots
 * remain as a convenience; these files are what a shadcn consumer's existing
 * imports resolve to.
 *
 * These tests assert the composed tree, not a computed layout: jsdom has no
 * compiled Tailwind sheet, so the proof that CardAction finally places is
 * structural (direct child of a grid header) plus the class strings that make
 * it resolve.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean } from '../../harness/conformance';
import Card from '../../../src/components/card/card.astro';
import CardHeader from '../../../src/components/card/card-header.astro';
import CardTitle from '../../../src/components/card/card-title.astro';
import CardAction from '../../../src/components/card/card-action.astro';
import CardContent from '../../../src/components/card/card-content.astro';
import CardFooter from '../../../src/components/card/card-footer.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderOne(
  Component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('card astro sub-components [parity surface]', () => {
  it('CardHeader renders the grid header with its data-slot', async () => {
    const body = await renderOne(CardHeader, {}, { default: 'H' });
    const header = body.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.className).toContain('grid');
    expect(header.className).toContain('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
    expect(header.textContent).toContain('H');
  });

  it('CardTitle is a real h3 by default and honours as', async () => {
    const asH3 = await renderOne(CardTitle, {}, { default: 'Report' });
    const title = asH3.querySelector('[data-slot="card-title"]') as HTMLElement;
    expect(title.tagName).toBe('H3');
    expect(title.className).toContain('text-title-medium');

    const asH2 = await renderOne(CardTitle, { as: 'h2' }, { default: 'Report' });
    expect((asH2.querySelector('[data-slot="card-title"]') as HTMLElement).tagName).toBe('H2');
  });

  it('CardContent and CardFooter carry the horizontal inset only', async () => {
    const content = await renderOne(CardContent, {}, { default: 'C' });
    const contentEl = content.querySelector('[data-slot="card-content"]') as HTMLElement;
    expect(contentEl.className).toBe('px-6');

    const footer = await renderOne(CardFooter, {}, { default: 'F' });
    const footerEl = footer.querySelector('[data-slot="card-footer"]') as HTMLElement;
    expect(footerEl.className).toContain('px-6');
    expect(footerEl.className).toContain('flex items-center');
  });

  it('CardAction carries the grid placement utilities and its data-slot', async () => {
    const body = await renderOne(
      CardAction,
      {},
      { default: '<button type="button">Menu</button>' },
    );
    const action = body.querySelector('[data-slot="card-action"]') as HTMLElement;
    expect(action.className).toContain('col-start-2');
    expect(action.className).toContain('row-start-1');
    expect(action.className).toContain('justify-self-end');
  });

  it('class is NOT a prop on any sub-component -- it never reaches the element', async () => {
    // The one deliberate API break in the drop-in contract (see card.md).
    for (const [Component, slot] of [
      [CardHeader, 'card-header'],
      [CardTitle, 'card-title'],
      [CardAction, 'card-action'],
      [CardContent, 'card-content'],
      [CardFooter, 'card-footer'],
    ] as const) {
      const body = await renderOne(Component, { class: 'mt-4' }, { default: 'x' });
      const el = body.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      expect(el, slot).not.toBeNull();
      expect(el.className, slot).not.toContain('mt-4');
    }
  });

  it('class is NOT a prop on the Card root either', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, { props: { class: 'mt-4' } });
    document.body.innerHTML = `<main>${html}</main>`;
    const root = document.body.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('rounded-xl');
    expect(root.className).not.toContain('mt-4');
  });

  it('composes into a Card exactly like the React tree, axe-clean', async () => {
    // The whole point of restoring these files: this tree, with no slot syntax.
    const container = await AstroContainer.create();
    const header = await container.renderToString(CardHeader, {
      slots: {
        default:
          (await container.renderToString(CardTitle, { slots: { default: 'Quarterly report' } })) +
          (await container.renderToString(CardAction, {
            slots: { default: '<button type="button">Menu</button>' },
          })),
      },
    });
    const content = await container.renderToString(CardContent, {
      slots: { default: 'Revenue is up.' },
    });
    const html = await container.renderToString(Card, {
      props: { as: 'article' },
      slots: { default: header + content },
    });
    document.body.innerHTML = `<main>${html}</main>`;

    const root = document.body.querySelector('article[data-part="root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.getAttribute('data-slot')).toBe('card');

    const headerEl = root.querySelector('[data-slot="card-header"]') as HTMLElement;
    const actionEl = root.querySelector('[data-slot="card-action"]') as HTMLElement;
    // The placement fix, proved structurally: the action is a DIRECT CHILD of
    // the grid header, which is what it never was while the header was flex.
    expect(actionEl.parentElement).toBe(headerEl);
    expect(headerEl.className).toContain('grid');
    expect(root.querySelector('h3')?.textContent).toContain('Quarterly report');
    expect(root.textContent).toContain('Revenue is up.');

    // No phantom regions: only the parts actually composed are present.
    expect(root.querySelector('[data-slot="card-footer"]')).toBeNull();
    expect(root.querySelectorAll('[data-slot="card-header"]')).toHaveLength(1);
    // Root remains the only declared part.
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);

    await assertAxeClean(document.body);
  });
});
