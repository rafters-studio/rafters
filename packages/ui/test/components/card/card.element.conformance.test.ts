/**
 * Web Component performance of the Card score. The SAME score as the React
 * conformance test -- but Card is a pure static, so there is no controller to
 * drive. The WC renders the surface markup with the shared classes and named
 * slots, once, and that is the whole performance. These assertions prove the
 * one contract (root renders, empty projection, slots pass through) holds in
 * the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersCard } from '../../../src/components/card/card.element';
import { card } from '../../../src/components/card/card.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-card')) {
    customElements.define('rafters-card', RaftersCard);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-card ${attrs}>${slots}</rafters-card>`;
  return document.body.querySelector('rafters-card') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('card conformance [wc]', () => {
  it('renders a root surface part carrying the shared card classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('bg-card');
    expect(root.className).toContain('rounded-xl');
    expect(root.className).toContain('border border-card-border');
  });

  it('root carries the data-slot swap contract alongside its data-part', () => {
    const host = mount();
    expect(shadowRoot(host).getAttribute('data-slot')).toBe('card');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(card, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part -- sub-wrappers carry classes, no data-part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('exposes the full named-slot surface plus a default slot', () => {
    const host = mount();
    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'header',
        'title',
        'description',
        'content',
        'footer',
        'action',
        null,
      ]),
    );
  });

  it('nests title/description/action inside the header region (React parity)', () => {
    const host = mount();
    const header = host.shadowRoot?.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header).not.toBeNull();
    for (const name of ['title', 'description', 'action']) {
      expect(header.querySelector(`slot[name="${name}"]`), name).not.toBeNull();
    }
    // content and footer are root-level siblings, not header-nested
    expect(header.querySelector('slot[name="content"]')).toBeNull();
    expect(header.querySelector('slot[name="footer"]')).toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<h3 slot="title">Report</h3><div slot="content">Body</div>');
    const titleSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const assigned = titleSlot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Report');
  });

  it('fill attribute mirrors the React prop through the same projection', () => {
    const host = mount('fill="primary"');
    const root = shadowRoot(host);
    expect(root.className).toContain('bg-primary');
    expect(root.className).not.toContain('bg-card');
  });

  it('re-renders the surface when fill changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('bg-card');
    host.setAttribute('fill', 'primary');
    expect(shadowRoot(host).className).toContain('bg-primary');
  });

  it('is axe-clean', async () => {
    // Rendered inside a landmark -- a card is a surface, not a landmark, so
    // the page around it supplies the region (axe best-practice `region`).
    document.body.innerHTML =
      '<main><rafters-card><h3 slot="title">Report</h3><div slot="content">Body</div></rafters-card></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
