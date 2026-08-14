/**
 * Web Component performance of the Kbd score. The SAME score as the React
 * conformance test -- but Kbd is a pure static, so there is no controller to
 * drive. The WC renders the semantic <kbd> cap with the shared classes and a
 * default slot, once, and that is the whole performance. These assertions prove
 * the one contract (root renders, empty projection, slot passes through) holds
 * in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersKbd } from '../../../src/components/kbd/kbd.element';
import { kbd } from '../../../src/components/kbd/kbd.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-kbd')) {
    customElements.define('rafters-kbd', RaftersKbd);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-kbd ${attrs}>${slots}</rafters-kbd>`;
  return document.body.querySelector('rafters-kbd') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('kbd conformance [wc]', () => {
  it('renders a <kbd> root cap carrying the shared classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('kbd');
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('ts-code-small');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(kbd, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part -- the cap carries the sole data-part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('observedAttributes is empty -- no variants or sizes', () => {
    expect(RaftersKbd.observedAttributes).toEqual([]);
  });

  it('exposes a single default slot for the key text', () => {
    const host = mount();
    const slots = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.getAttribute('name')).toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', 'Enter');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Enter');
  });

  it('is axe-clean when scoped to its host', async () => {
    const host = mount('', 'Enter');
    const results = await axe(host);
    expect(results.violations).toEqual([]);
  });
});
