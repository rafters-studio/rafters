/**
 * Web Component performance of the Empty score. The SAME score as the React
 * conformance test -- but Empty is a pure static, so there is no controller to
 * drive. The WC renders the placeholder markup with the shared classes and
 * named slots, once, and that is the whole performance. These assertions prove
 * the one contract (root renders, empty projection, slots pass through) holds
 * in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersEmpty } from '../../../src/components/empty/empty.element';
import { empty } from '../../../src/components/empty/empty.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-empty')) {
    customElements.define('rafters-empty', RaftersEmpty);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-empty ${attrs}>${slots}</rafters-empty>`;
  return document.body.querySelector('rafters-empty') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('empty conformance [wc]', () => {
  it('renders a root part carrying the shared centered-column classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex flex-col');
    expect(root.className).toContain('items-center');
    expect(root.className).toContain('py-12');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(empty, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part -- sub-wrappers carry classes, no data-part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('exposes the icon/title/description/action named slots plus a default slot', () => {
    const host = mount();
    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(expect.arrayContaining(['icon', 'title', 'description', 'action', null]));
  });

  it('sub-wrappers carry data-slot markers matching React/Astro', () => {
    const host = mount();
    const root = host.shadowRoot;
    expect(root?.querySelector('[data-slot="empty-icon"]')).not.toBeNull();
    expect(root?.querySelector('[data-slot="empty-title"]')).not.toBeNull();
    expect(root?.querySelector('[data-slot="empty-description"]')).not.toBeNull();
    expect(root?.querySelector('[data-slot="empty-action"]')).not.toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<h3 slot="title">All caught up</h3>');
    const titleSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const assigned = titleSlot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('All caught up');
  });

  it('observedAttributes is an empty array -- nothing to observe', () => {
    expect(Array.from(RaftersEmpty.observedAttributes)).toEqual([]);
  });

  it('is axe-clean', async () => {
    document.body.innerHTML =
      '<main><rafters-empty><h3 slot="title">All caught up</h3><p slot="description">No new notifications.</p></rafters-empty></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
