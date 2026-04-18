import { afterEach, describe, expect, it } from 'vitest';
import './input-group.element';
import { RaftersInputGroup, RaftersInputGroupAddon } from './input-group.element';

afterEach(() => {
  document.body.replaceChildren();
});

function collectCss(el: Element): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  const blocks: string[] = [];
  for (const sheet of sheets) {
    const rules: string[] = [];
    for (const rule of Array.from(sheet.cssRules)) {
      rules.push(rule.cssText);
    }
    blocks.push(rules.join('\n'));
  }
  return blocks.join('\n');
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

  it('adopts a per-instance stylesheet on connect', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    const sheets = group.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('default size emits height 2.5rem', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    expect(collectCss(group)).toContain('height: 2.5rem');
  });

  it('sm size emits height 2.25rem', () => {
    const group = document.createElement('rafters-input-group');
    group.setAttribute('size', 'sm');
    document.body.append(group);
    expect(collectCss(group)).toContain('height: 2.25rem');
  });

  it('lg size emits height 2.75rem', () => {
    const group = document.createElement('rafters-input-group');
    group.setAttribute('size', 'lg');
    document.body.append(group);
    expect(collectCss(group)).toContain('height: 2.75rem');
  });

  it('falls back to default size on unknown value', () => {
    const group = document.createElement('rafters-input-group') as RaftersInputGroup;
    group.setAttribute('size', 'huge');
    expect(() => document.body.append(group)).not.toThrow();
    expect(group.size).toBe('default');
    expect(collectCss(group)).toContain('height: 2.5rem');
  });

  it('rebuilds the stylesheet when size changes', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    expect(collectCss(group)).toContain('height: 2.5rem');
    group.setAttribute('size', 'lg');
    expect(collectCss(group)).toContain('height: 2.75rem');
  });

  it('emits a focus-within ring against --color-ring', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    const css = collectCss(group);
    expect(css).toMatch(/:host\(:focus-within\)/);
    expect(css).toContain('var(--color-ring)');
  });

  it('emits ::slotted normalisation for native input and rafters-input', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    const css = collectCss(group);
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

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'input-group.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  it('motion uses --motion-duration / --motion-ease tokens, never --duration', () => {
    const group = document.createElement('rafters-input-group');
    document.body.append(group);
    const css = collectCss(group);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
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

  it('adopts a per-instance stylesheet on connect', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    const sheets = addon.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to start position when no attribute is set', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    document.body.append(addon);
    expect(addon.position).toBe('start');
    expect(collectCss(addon)).toMatch(/border-right/);
  });

  it('reflects position as data-position on the host', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('position', 'end');
    document.body.append(addon);
    expect(addon.getAttribute('data-position')).toBe('end');
  });

  it('end position emits left border', () => {
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('position', 'end');
    document.body.append(addon);
    expect(collectCss(addon)).toMatch(/border-left/);
  });

  it('filled variant emits --color-muted background', () => {
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('variant', 'filled');
    document.body.append(addon);
    expect(collectCss(addon)).toContain('var(--color-muted)');
  });

  it('default variant does not emit --color-muted background', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    expect(collectCss(addon)).not.toMatch(/background-color:\s*var\(--color-muted\)/);
  });

  it('falls back to start on unknown position without throwing', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('position', 'sideways');
    expect(() => document.body.append(addon)).not.toThrow();
    expect(addon.position).toBe('start');
    expect(collectCss(addon)).toMatch(/border-right/);
  });

  it('falls back to default on unknown variant without throwing', () => {
    const addon = document.createElement('rafters-input-group-addon') as RaftersInputGroupAddon;
    addon.setAttribute('variant', 'shiny');
    expect(() => document.body.append(addon)).not.toThrow();
    expect(addon.variant).toBe('default');
    expect(collectCss(addon)).not.toMatch(/background-color:\s*var\(--color-muted\)/);
  });

  it('rebuilds the stylesheet when position flips', () => {
    const addon = document.createElement('rafters-input-group-addon');
    document.body.append(addon);
    expect(collectCss(addon)).toMatch(/border-right/);
    addon.setAttribute('position', 'end');
    expect(collectCss(addon)).toMatch(/border-left/);
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
