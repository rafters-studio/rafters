/**
 * Web Component performance of the Item score. The SAME score as the React
 * conformance test: Item has no bind, but its config-driven projection
 * (role=option + selected/disabled semantics) must hold in the shadow-DOM
 * performance too. These assertions prove the projection and the slot
 * structure agree with React and Astro.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersItem } from '../../../src/components/item/item.element';
import { item } from '../../../src/components/item/item.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-item')) {
    customElements.define('rafters-item', RaftersItem);
  }
});

/** An option needs a listbox ancestor (axe aria-required-parent), and page
 *  content needs a landmark (axe best-practice `region`); mount inside both. */
function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<main><div role="listbox" aria-label="Options"><rafters-item ${attrs}>${slots}</rafters-item></div></main>`;
  return document.body.querySelector('rafters-item') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('item conformance [wc]', () => {
  it('renders a root row part carrying the shared item classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('rounded-md');
  });

  it('fulfills the contract: default projects role=option, aria-selected=false, tabindex 0', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(item, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('reflects the selected attribute to aria-selected + data-selected', () => {
    const host = mount('selected');
    const root = shadowRoot(host);
    assertContractFulfillment(item, root, {}, { selected: true }, ['root']);
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
  });

  it('reflects the disabled attribute to aria-disabled + data-disabled + tabindex -1', () => {
    const host = mount('disabled');
    const root = shadowRoot(host);
    assertContractFulfillment(item, root, {}, { disabled: true }, ['root']);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.getAttribute('tabindex')).toBe('-1');
  });

  it('re-projects when selected changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).getAttribute('aria-selected')).toBe('false');
    host.setAttribute('selected', '');
    expect(shadowRoot(host).getAttribute('aria-selected')).toBe('true');
    expect(shadowRoot(host).hasAttribute('data-selected')).toBe(true);
  });

  it('reflects size changes to the inner class string', () => {
    const host = mount();
    host.setAttribute('size', 'lg');
    expect(shadowRoot(host).className).toContain('ts-body-medium');
    host.setAttribute('size', 'sm');
    expect(shadowRoot(host).className).toContain('ts-label-small');
  });

  it('exposes the icon / default / description slots', () => {
    const host = mount();
    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(expect.arrayContaining(['icon', 'description', null]));
  });

  it('only the row is a declared part -- wrappers carry classes, no data-part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('is axe-clean inside a listbox', async () => {
    mount('selected', 'Dashboard');
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
