/**
 * Web Component performance of the Label score. The SAME score as the React
 * conformance test -- but Label is a pure static, so there is no controller to
 * drive. The WC renders the inner label with the shared classes and a default
 * slot, once, plus the oracle's `for`-forwarding onto the inner label. These
 * assertions prove the one contract (root renders, empty projection, slot
 * passes through) and the native `for` forwarding hold in the shadow-DOM
 * performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { label } from '../../../src/components/label/label.behavior';
import { labelVariantClasses } from '../../../src/components/label/label.classes';
import { RaftersLabel } from '../../../src/components/label/label.element';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-label')) {
    customElements.define('rafters-label', RaftersLabel);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-label ${attrs}>${slots}</rafters-label>`;
  return document.body.querySelector('rafters-label') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('label conformance [wc]', () => {
  it('registers the rafters-label tag', () => {
    expect(customElements.get('rafters-label')).toBe(RaftersLabel);
  });

  it('renders an inner <label> root part carrying the shared classes', () => {
    const root = shadowRoot(mount());
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('label');
    expect(root.className).toContain('text-label-medium');
    expect(root.className).toContain('text-foreground');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const root = shadowRoot(mount());
    assertContractFulfillment(label, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('exposes a single default slot', () => {
    const host = mount();
    const slots = host.shadowRoot?.querySelectorAll('slot') ?? [];
    expect(slots).toHaveLength(1);
    expect(slots[0]?.getAttribute('name')).toBeNull();
  });

  it('slotted light-DOM text passes through', () => {
    const host = mount('', 'Email address');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Email address');
  });

  it('variant reflects to the inner class string, unknown falls back to default', () => {
    const host = mount('variant="destructive"');
    expect(shadowRoot(host).className).toContain(labelVariantClasses.destructive);
    host.setAttribute('variant', 'nonsense');
    expect(shadowRoot(host).className).toContain(labelVariantClasses.default);
  });

  it('forwards the host `for` attribute onto the inner label (native association)', () => {
    const host = mount('for="email"');
    expect(shadowRoot(host).getAttribute('for')).toBe('email');
  });

  it('updates the inner `for` when the host attribute changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).getAttribute('for')).toBeNull();
    host.setAttribute('for', 'email');
    expect(shadowRoot(host).getAttribute('for')).toBe('email');
    host.removeAttribute('for');
    expect(shadowRoot(host).getAttribute('for')).toBeNull();
  });

  it('observes exactly variant and for', () => {
    expect(RaftersLabel.observedAttributes).toEqual(['variant', 'for']);
  });

  it('is axe-clean', async () => {
    const host = mount('', 'Email address');
    const results = await axe(host);
    expect(results.violations).toEqual([]);
  });
});
