/**
 * Web Component performance of the Item score. The SAME score as the React
 * spec: Item has no bind, but its config-driven projection
 * (role=option + selected/disabled semantics) must hold in the shadow-DOM
 * performance too. These assertions prove the projection and the slot
 * structure agree with React and Astro. `item.element.ts` self-registers
 * `rafters-item` on import, guarded, so no explicit customElements.define is
 * needed here.
 */
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/item/item.element';
import {
  item,
  type ItemConfig,
  type ItemPart,
  type ItemState,
} from '../../../src/components/item/item.behavior';

/** An option needs a listbox ancestor; mount inside one. */
function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<div role="listbox" aria-label="Options"><rafters-item ${attrs}>${slots}</rafters-item></div>`;
  return document.body.querySelector('rafters-item') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

/**
 * Fulfils the contract: the FULL aria projection (role, aria-selected,
 * aria-disabled, tabindex, data-selected, data-disabled) on the rendered root
 * matches what `item.aria` computes for the same config -- including every
 * attribute a projected `undefined` says must be ABSENT.
 */
function assertAriaContract(root: HTMLElement, state: ItemState, config: ItemConfig): void {
  const ids = { root: root.id } as Record<ItemPart, string>;
  const projection = item.aria(state, config, ids).root ?? {};
  for (const [attr, value] of Object.entries(projection)) {
    if (value === undefined) {
      expect(root.hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
    } else {
      expect(root.getAttribute(attr)).toBe(String(value));
    }
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('item [wc]', () => {
  it('renders a root row part carrying the shared item classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex items-center');
    expect(root.className).toContain('rounded-md');
  });

  it('default projects role=option, aria-selected=false, tabindex 0', () => {
    const root = shadowRoot(mount());
    assertAriaContract(root, {}, {});
    expect(root.getAttribute('role')).toBe('option');
    expect(root.getAttribute('aria-selected')).toBe('false');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('reflects the selected attribute to aria-selected + data-selected', () => {
    const root = shadowRoot(mount('selected'));
    assertAriaContract(root, {}, { selected: true });
    expect(root.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-selected')).toBe(true);
  });

  it('reflects the disabled attribute to aria-disabled + data-disabled + tabindex -1', () => {
    const root = shadowRoot(mount('disabled'));
    assertAriaContract(root, {}, { disabled: true });
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
});
