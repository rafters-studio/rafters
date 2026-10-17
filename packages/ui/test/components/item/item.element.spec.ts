/**
 * Web Component performance of the Item score. Item is a static with a
 * config-driven projection: the element renders the option row with the shared
 * classes and named slots, applies `item.aria` in render(), binds nothing and
 * dispatches no event. `item.element.ts` self-registers `rafters-item`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { item, type ItemConfig, type ItemSize } from '../../../src/components/item/item.behavior';
import {
  itemClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemIconClasses,
  itemLabelClasses,
} from '../../../src/components/item/item.classes';
import { RaftersItem } from '../../../src/components/item/item.element';
import { RaftersElement } from '../../../src/primitives/rafters-element';

// Set before any mount: RaftersElement adopts the shared sheet on connect.
RaftersElement.setUtilityCSS('.rounded-md{border-radius:6px}');

function mount(attrs = '', content = 'Settings'): RaftersItem {
  document.body.innerHTML = `<div role="listbox" aria-label="Menu"><rafters-item ${attrs}>${content}</rafters-item></div>`;
  return document.body.querySelector('rafters-item') as RaftersItem;
}

function rowOf(host: RaftersItem): HTMLElement {
  return host.shadowRoot?.querySelector('[data-part="root"]') as HTMLElement;
}

function expectProjection(row: HTMLElement, config: ItemConfig): void {
  const projected = item.aria({}, config, { root: '' }).root ?? {};
  for (const [name, value] of Object.entries(projected)) {
    expect(row.getAttribute(name)).toBe(value ?? null);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('item [wc]', () => {
  it('is a registered RaftersItem with an open shadow root holding the option row', () => {
    const host = mount();
    expect(host).toBeInstanceOf(RaftersItem);
    const row = rowOf(host);
    expect(row.tagName).toBe('DIV');
    expect(row.className).toBe(
      itemClasses({ size: 'default', selected: false, disabled: false }, {}).root,
    );
    expect(row.getAttribute('role')).toBe('option');
    expect(row.getAttribute('aria-selected')).toBe('false');
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.hasAttribute('aria-disabled')).toBe(false);
    expect(row.hasAttribute('data-selected')).toBe(false);
    expect(row.hasAttribute('data-disabled')).toBe(false);
  });

  it('observedAttributes is size, selected, disabled', () => {
    expect(RaftersItem.observedAttributes).toEqual(['size', 'selected', 'disabled']);
  });

  it('composes the icon, content, label and description wrappers with their classes', () => {
    const row = rowOf(mount('', 'Settings<span slot="description">Home</span>'));
    expect(row.children).toHaveLength(2);
    const [icon, content] = Array.from(row.children) as HTMLElement[];
    expect(icon?.className).toBe(itemIconClasses);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('slot[name="icon"]')).not.toBeNull();
    expect(content?.className).toBe(itemContentClasses);
    const [label, description] = Array.from(content?.children ?? []) as HTMLElement[];
    expect(label?.className).toBe(itemLabelClasses);
    expect(description?.className).toBe(itemDescriptionClasses);
    expect(description?.querySelector('slot[name="description"]')).not.toBeNull();
    expect(row.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('the default slot is assigned the label and the description slot its content', () => {
    const host = mount('', 'Settings<span slot="description">Home</span>');
    const shadow = host.shadowRoot as ShadowRoot;
    const text = (slot: HTMLSlotElement) =>
      slot
        .assignedNodes()
        .map((n) => n.textContent)
        .join('');
    expect(text(shadow.querySelector('slot:not([name])') as HTMLSlotElement)).toBe('Settings');
    expect(text(shadow.querySelector('slot[name="description"]') as HTMLSlotElement)).toBe('Home');
  });

  it('each size renders its itemClasses root', () => {
    for (const size of ['default', 'sm', 'lg'] as ItemSize[]) {
      expect(rowOf(mount(`size="${size}"`)).className).toBe(itemClasses({ size }, {}).root);
    }
  });

  it('an unknown size renders the default and does not throw', () => {
    expect(rowOf(mount('size="huge"')).className).toBe(itemClasses({ size: 'default' }, {}).root);
  });

  it('selected and disabled project exactly item.aria for all four combinations', () => {
    for (const selected of [false, true]) {
      for (const disabled of [false, true]) {
        const attrs = `${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`;
        expectProjection(rowOf(mount(attrs)), { size: 'default', selected, disabled });
      }
    }
  });

  it('re-renders on each attribute change', () => {
    const host = mount();
    host.setAttribute('disabled', '');
    expect(rowOf(host).getAttribute('aria-disabled')).toBe('true');
    expect(rowOf(host).getAttribute('tabindex')).toBe('-1');
    host.removeAttribute('disabled');
    expect(rowOf(host).hasAttribute('aria-disabled')).toBe(false);
    expect(rowOf(host).getAttribute('tabindex')).toBe('0');
    host.setAttribute('selected', '');
    expect(rowOf(host).getAttribute('aria-selected')).toBe('true');
    expect(rowOf(host).hasAttribute('data-selected')).toBe(true);
    host.setAttribute('size', 'lg');
    expect(rowOf(host).className).toBe(itemClasses({ size: 'lg', selected: true }, {}).root);
  });

  it('dispatches no event and claims no key', () => {
    const host = mount();
    const seen: string[] = [];
    for (const type of ['click', 'keydown', 'change', 'input']) {
      host.addEventListener(type, (e) => seen.push(e.type));
    }
    host.setAttribute('selected', '');
    host.setAttribute('disabled', '');
    const key = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    rowOf(host).dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    expect(seen).toEqual(['keydown']);
  });

  it('functional: selected sm row with description, then disabled', () => {
    document.body.innerHTML =
      '<div role="listbox" aria-label="Menu"><rafters-item selected size="sm">Dashboard<span slot="description">Home</span></rafters-item></div>';
    const host = document.querySelector('rafters-item') as RaftersItem;
    const shadow = host.shadowRoot as ShadowRoot;
    const row = shadow.querySelector('[data-part="root"]') as HTMLElement;
    const config: ItemConfig = { size: 'sm', selected: true, disabled: false };
    expect(row.className).toBe(itemClasses(config, {}).root);
    expect(getComputedStyle(row).borderTopLeftRadius).toBe('6px');
    for (const [name, value] of Object.entries(item.aria({}, config, { root: '' }).root ?? {})) {
      expect(row.getAttribute(name)).toBe(value ?? null);
    }
    expect((row.firstElementChild as HTMLElement).className).toBe(itemIconClasses);
    expect(shadow.querySelector('slot[name="icon"]')).not.toBeNull();
    const desc = shadow.querySelector('slot[name="description"]') as HTMLSlotElement;
    expect(
      desc
        .assignedNodes()
        .map((n) => n.textContent)
        .join(''),
    ).toBe('Home');

    host.setAttribute('disabled', '');
    const after = shadow.querySelector('[data-part="root"]') as HTMLElement;
    expect(after.getAttribute('aria-disabled')).toBe('true');
    expect(after.getAttribute('tabindex')).toBe('-1');
  });

  it('the shared utility sheet applies inside the shadow root', () => {
    expect(getComputedStyle(rowOf(mount())).borderTopLeftRadius).toBe('6px');
  });
});
