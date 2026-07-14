/**
 * Astro performance of the Card score. Card is a PURE STATIC -- the score
 * projects no ARIA, holds no state, runs no effects -- so its Astro file ships
 * NO <script> and there is NO bindCard. This test renders the server markup
 * and asserts the one contract a static surface can carry: the root region,
 * the named-slot structure with its data-slot markers, and axe cleanliness.
 * One score, three performances; here the performance is markup + classes +
 * slots, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Card from '../../../src/components/card/card.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Card, { props, slots });
  // A card is a surface, not a landmark; the page around it supplies the
  // region so the axe best-practice `region` rule is satisfied.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('card conformance [astro]', () => {
  it('renders a root surface part carrying the shared card classes', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('bg-card');
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('border border-card-border');
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part -- sub-wrappers carry classes, not data-part', async () => {
    const body = await render();
    const parts = body.querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('exposes the full named-slot region: header nests title/description/action', async () => {
    const body = await render();
    const header = body.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.querySelector('[data-slot="card-title"]')).not.toBeNull();
    expect(header.querySelector('[data-slot="card-description"]')).not.toBeNull();
    expect(header.querySelector('[data-slot="card-action"]')).not.toBeNull();
    // content and footer are root-level siblings, not header-nested.
    expect(body.querySelector('[data-slot="card-content"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="card-footer"]')).not.toBeNull();
    expect(header.querySelector('[data-slot="card-content"]')).toBeNull();
    expect(header.querySelector('[data-slot="card-footer"]')).toBeNull();
  });

  it('slotted content projects into its region', async () => {
    const body = await render(
      {},
      {
        title: '<h3>Report</h3>',
        description: 'A summary',
        content: '<p>Body</p>',
        footer: '<span>Footer</span>',
      },
    );
    const title = body.querySelector('[data-slot="card-title"]') as HTMLElement;
    expect(title.textContent).toContain('Report');
    expect((body.querySelector('[data-slot="card-content"]') as HTMLElement).textContent).toContain(
      'Body',
    );
  });

  it('fill mirrors the React/WC prop through the same class projection', async () => {
    const body = await render({ fill: 'primary' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).not.toContain('bg-card');
    expect(root.getAttribute('data-fill')).toBe('primary');
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render({}, { title: '<h3>Report</h3>', content: '<p>Body</p>' });
    await assertAxeClean(body);
  });
});
