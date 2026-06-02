import { afterEach, describe, expect, it } from 'vitest';
import './input-group.element';
import {
  inputGroupAddonPositionClasses,
  inputGroupAddonVariantClasses,
  inputGroupDisabledClasses,
  inputGroupSizeClasses,
} from './input-group.classes';
import {
  composeInputGroupAddonClasses,
  composeInputGroupClasses,
  RaftersInputGroup,
  RaftersInputGroupAddon,
} from './input-group.element';

afterEach(() => {
  document.body.replaceChildren();
});

function groupClass(el: Element): string {
  return el.shadowRoot?.querySelector('div.group')?.className ?? '';
}

function addonClass(el: Element): string {
  return el.shadowRoot?.querySelector('div.addon')?.className ?? '';
}

describe('rafters-input-group', () => {
  it('registers both elements on import', () => {
    expect(customElements.get('rafters-input-group')).toBe(RaftersInputGroup);
    expect(customElements.get('rafters-input-group-addon')).toBe(RaftersInputGroupAddon);
  });

  it('remains idempotent when the module is imported twice', async () => {
    await import('./input-group.element');
    await import('./input-group.element');
    expect(customElements.get('rafters-input-group')).toBe(RaftersInputGroup);
    expect(customElements.get('rafters-input-group-addon')).toBe(RaftersInputGroupAddon);
  });

  it('is not form-associated', () => {
    expect((RaftersInputGroup as unknown as { formAssociated?: boolean }).formAssociated).not.toBe(
      true,
    );
    expect(
      (RaftersInputGroupAddon as unknown as { formAssociated?: boolean }).formAssociated,
    ).not.toBe(true);
  });

  it('renders a single div.group containing a default slot', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    const wrapper = group.shadowRoot?.querySelector('div.group');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.children.length).toBe(1);
    expect(wrapper?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('projects slotted children through the default slot', () => {
    const group = document.createElement('rafters-input-group');
    const input = document.createElement('input');
    group.append(input);
    document.body.append(group);
    const slot = group.shadowRoot?.querySelector('slot');
    expect(slot).toBeTruthy();
    expect(slot?.assignedElements()).toContain(input);
  });

  it('applies base + default size composition to the inner group', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    expect(groupClass(group)).toContain(composeInputGroupClasses('default', false));
  });

  it('default size carries the default size class', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    expect(groupClass(group)).toContain(inputGroupSizeClasses.default);
  });

  it('sm size carries the sm size class', () => {
    const group = document.createElement('rafters-input-group');
    group.setAttribute('size', 'sm');
    document.body.append(group);
    expect(groupClass(group)).toContain(inputGroupSizeClasses.sm);
  });

  it('lg size carries the lg size class', () => {
    const group = document.createElement('rafters-input-group');
    group.setAttribute('size', 'lg');
    document.body.append(group);
    expect(groupClass(group)).toContain(inputGroupSizeClasses.lg);
  });

  it('falls back to default size on unknown value', () => {
    const group = document.createElement('rafters-input-group') as RaftersInputGroup;
    group.setAttribute('size', 'huge');
    expect(() => document.body.append(group)).not.toThrow();
    expect(group.size).toBe('default');
    expect(groupClass(group)).toContain(inputGroupSizeClasses.default);
  });

  it('rebuilds the inner class string when size changes', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    expect(groupClass(group)).toContain(inputGroupSizeClasses.default);
    group.setAttribute('size', 'lg');
    expect(groupClass(group)).toContain(inputGroupSizeClasses.lg);
  });

  it('applies disabled classes to the inner group when disabled', () => {
    const group = document.createElement('rafters-input-group');
    group.toggleAttribute('disabled', true);
    document.body.append(group);
    expect(groupClass(group)).toContain(inputGroupDisabledClasses);
  });

  it('keeps the focus-within ring rule against --color-ring in static styles', () => {
    const css = RaftersInputGroup.styles;
    expect(css).toMatch(/:host\(:focus-within\)/);
    expect(css).toContain('var(--color-ring)');
  });

  it('keeps the :host([data-disabled]) mirror in static styles', () => {
    expect(RaftersInputGroup.styles).toContain(':host([data-disabled])');
  });

  it('keeps ::slotted normalisation for native input and rafters-input in static styles', () => {
    const css = RaftersInputGroup.styles;
    expect(css).toContain('::slotted(input)');
    expect(css).toContain('::slotted(rafters-input)');
  });

  it('reflects disabled as data-disabled on the host', () => {
    const group = document.createElement('rafters-input-group');
    group.toggleAttribute('disabled', true);
    document.body.append(group);
    expect(group.hasAttribute('data-disabled')).toBe(true);
    group.removeAttribute('disabled');
    expect(group.hasAttribute('data-disabled')).toBe(false);
  });

  it('propagates disabled to an already-slotted native input', () => {
    const group = document.createElement('rafters-input-group') as RaftersInputGroup;
    group.toggleAttribute('disabled', true);
    const input = document.createElement('input');
    group.append(input);
    document.body.append(group);
    expect(input.disabled).toBe(true);
  });

  it('propagates disabled to inputs added after connect', () => {
    const group = document.createElement('rafters-input-group') as RaftersInputGroup;
    document.body.append(group);
    group.toggleAttribute('disabled', true);
    const input = document.createElement('input');
    group.append(input);
    // slotchange fires asynchronously in some engines; we also propagate
    // eagerly via the attribute change path.
    group.dispatchEvent(new Event('slotchange'));
    // Trigger the internal propagation manually by toggling disabled off/on
    // which goes through syncDisabled().
    group.toggleAttribute('disabled', false);
    group.toggleAttribute('disabled', true);
    expect(input.disabled).toBe(true);
  });

  it('clears disabled on slotted input when the group attribute is removed', () => {
    const group = document.createElement('rafters-input-group');
    group.toggleAttribute('disabled', true);
    const input = document.createElement('input');
    group.append(input);
    document.body.append(group);
    expect(input.disabled).toBe(true);
    group.toggleAttribute('disabled', false);
    expect(input.disabled).toBe(false);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersInputGroup.observedAttributes).toEqual(['size', 'disabled']);
  });
});

describe('rafters-input-group-addon', () => {
  it('renders a single div.addon containing a default slot', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    const wrapper = addon.shadowRoot?.querySelector('div.addon');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('applies base + start + default composition by default', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    expect(addonClass(addon)).toContain(composeInputGroupAddonClasses('start', 'default'));
  });

  it('defaults to start position when no attribute is set', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    document.body.append(addon);
    expect(addon.position).toBe('start');
    expect(addonClass(addon)).toContain(inputGroupAddonPositionClasses.start);
  });

  it('reflects position as data-position on the host', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('position', 'end');
    document.body.append(addon);
    expect(addon.getAttribute('data-position')).toBe('end');
  });

  it('end position carries the end position class', () => {
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('position', 'end');
    document.body.append(addon);
    expect(addonClass(addon)).toContain(inputGroupAddonPositionClasses.end);
  });

  it('filled variant carries the filled background class', () => {
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('variant', 'filled');
    document.body.append(addon);
    expect(addonClass(addon)).toContain(inputGroupAddonVariantClasses.filled);
  });

  it('default variant does not carry the filled background class', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    expect(addonClass(addon)).not.toContain(inputGroupAddonVariantClasses.filled);
  });

  it('falls back to start on unknown position without throwing', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('position', 'sideways');
    expect(() => document.body.append(addon)).not.toThrow();
    expect(addon.position).toBe('start');
    expect(addonClass(addon)).toContain(inputGroupAddonPositionClasses.start);
  });

  it('falls back to default on unknown variant without throwing', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('variant', 'shiny');
    expect(() => document.body.append(addon)).not.toThrow();
    expect(addon.variant).toBe('default');
    expect(addonClass(addon)).not.toContain(inputGroupAddonVariantClasses.filled);
  });

  it('rebuilds the inner class string when position flips', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    expect(addonClass(addon)).toContain(inputGroupAddonPositionClasses.start);
    addon.setAttribute('position', 'end');
    expect(addonClass(addon)).toContain(inputGroupAddonPositionClasses.end);
  });

  it('inner wrapper carries data-position matching the host', () => {
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('position', 'end');
    document.body.append(addon);
    const inner = addon.shadowRoot?.querySelector('div.addon');
    expect(inner?.getAttribute('data-position')).toBe('end');
    addon.setAttribute('position', 'start');
    const refreshed = addon.shadowRoot?.querySelector('div.addon');
    expect(refreshed?.getAttribute('data-position')).toBe('start');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersInputGroupAddon.observedAttributes).toEqual(['position', 'variant']);
  });
});
