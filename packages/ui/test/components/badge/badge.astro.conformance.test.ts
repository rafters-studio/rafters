/**
 * Astro performance of the Badge score. Badge is a PURE STATIC -- the score
 * holds no state, claims no keys and projects an EMPTY aria map -- so its Astro
 * file ships NO <script> and there is NO bindBadge. This test renders the
 * server markup through the shared harness and asserts the contract a label
 * chip carries: a root span with the shared classes, the slotted label as the
 * entire accessible payload, no projected role, and axe cleanliness across the
 * whole variant vocabulary. One score, three performances; here it is markup +
 * classes, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { BADGE_VARIANTS, badge } from '../../../src/components/badge/badge.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';
import Badge from '../../../src/components/badge/badge.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = { default: 'New' },
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Badge, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('badge conformance [astro]', () => {
  it('renders a span carrying data-part="root" and the slotted label text', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName).toBe('SPAN');
    expect(root.textContent).toBe('New');
  });

  it('projects no ARIA role -- the label text is the accessible name', async () => {
    const body = await render({}, { default: 'Beta' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('fulfills the contract projection through the shared harness', async () => {
    const body = await render({ variant: 'info' }, { default: 'Info' });
    const root = partElement(body, 'root') as HTMLElement;
    assertContractFulfillment(badge, root, {}, { variant: 'info', size: 'default' }, ['root']);
  });

  it('defaults to the primary variant and default size (like React)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('px-2.5');
  });

  it('size selects the label-text scale', async () => {
    const body = await render({ size: 'lg' }, { default: 'Large' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('ts-label-medium');
  });

  it('carries the shadcn data-slot for drop-in parity', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('badge');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'ml-2' }, { default: 'Tagged' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('ml-2');
  });

  it('passes through arbitrary HTML attributes', async () => {
    const body = await render({ 'data-testid': 'badge', 'aria-label': 'status' });
    const element = body.querySelector('[data-testid="badge"]');
    expect(element?.getAttribute('aria-label')).toBe('status');
  });

  it('is a leaf: exactly one declared part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('every variant renders clean of axe violations', async () => {
    for (const variant of BADGE_VARIANTS) {
      const body = await render({ variant }, { default: variant });
      await assertAxeClean(body);
    }
  });
});
