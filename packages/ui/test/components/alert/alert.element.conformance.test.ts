/**
 * Web Component performance of the Alert score. The SAME score as the React
 * conformance test -- but Alert is a static, so there is no controller to
 * drive. The WC renders the banner markup with the shared classes and named
 * slots, painting the score's aria projection onto the root, and that is the
 * whole performance. These assertions prove the one contract (root renders,
 * role=alert projected, variant classes shared, slots pass through) holds in
 * the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { alert } from '../../../src/components/alert/alert.behavior';
import { RaftersAlert } from '../../../src/components/alert/alert.element';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-alert')) {
    customElements.define('rafters-alert', RaftersAlert);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-alert ${attrs}>${slots}</rafters-alert>`;
  return document.body.querySelector('rafters-alert') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('alert conformance [wc]', () => {
  it('fulfills the contract: root renders and carries the projected role=alert', () => {
    const root = shadowRoot(mount());
    expect(root).not.toBeNull();
    assertContractFulfillment(alert, root, {}, {}, ['root']);
  });

  it('projects role=alert regardless of variant', () => {
    expect(shadowRoot(mount('variant="destructive"')).getAttribute('role')).toBe('alert');
  });

  it('renders the shared base classes on the root', () => {
    const root = shadowRoot(mount());
    expect(root.className).toContain('relative w-full rounded-lg');
    expect(root.className).toContain('border');
    expect(root.className).toContain('p-4');
  });

  it('variant attribute mirrors the React prop through the same class projection', () => {
    const root = shadowRoot(mount('variant="success"'));
    expect(root.className).toContain('bg-success-subtle');
    expect(root.className).toContain('text-success-subtle-foreground');
    expect(root.className).toContain('border-success-border');
    expect(root.className).not.toContain('bg-primary-subtle');
  });

  it('an unknown variant falls back to default and never throws', () => {
    const root = shadowRoot(mount('variant="not-a-variant"'));
    expect(root.className).toContain('bg-primary-subtle');
  });

  it('re-renders the surface when variant changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('bg-primary-subtle');
    host.setAttribute('variant', 'destructive');
    expect(shadowRoot(host).className).toContain('bg-destructive-subtle');
  });

  it('observes only variant', () => {
    expect(Array.from(RaftersAlert.observedAttributes)).toEqual(['variant']);
  });

  it('only root is a declared part -- sub-wrappers carry classes, no data-part', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]') ?? []).toHaveLength(1);
  });

  it('exposes the title/description/action named slots plus a default slot', () => {
    const host = mount();
    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(expect.arrayContaining(['title', 'description', 'action', null]));
  });

  it('sub-wrappers carry data-slot markers matching React/Astro', () => {
    const root = mount().shadowRoot;
    expect(root?.querySelector('[data-slot="alert-title"]')).not.toBeNull();
    expect(root?.querySelector('[data-slot="alert-description"]')).not.toBeNull();
    expect(root?.querySelector('[data-slot="alert-action"]')).not.toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<span slot="title">Saved</span>');
    const titleSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const assigned = titleSlot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((node) => node.textContent).join('')).toContain('Saved');
  });

  it('is axe-clean', async () => {
    document.body.innerHTML =
      '<main><rafters-alert variant="success"><span slot="title">Saved</span><span slot="description">Your changes were saved.</span></rafters-alert></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
