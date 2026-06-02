import { afterEach, describe, expect, it } from 'vitest';
import './item.element';
import { itemDescriptionClasses, itemIconClasses, itemSizeClasses } from './item.classes';
import { composeItemClasses, RaftersItem } from './item.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-item');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function innerDiv(el: Element): HTMLElement | null {
  return el.shadowRoot?.querySelector('div[role="option"]') ?? null;
}

function innerClass(el: Element): string {
  return innerDiv(el)?.className ?? '';
}

describe('<rafters-item>', () => {
  it('registers the rafters-item tag on import', () => {
    expect(customElements.get('rafters-item')).toBe(RaftersItem);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./item.element')).resolves.toBeDefined();
    await expect(import('./item.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-item')).toBe(RaftersItem);
  });

  it('renders a div[role=option] with icon + default + description slots', () => {
    const el = mount();
    const inner = innerDiv(el);
    expect(inner).not.toBeNull();
    expect(inner?.getAttribute('role')).toBe('option');
    const slots = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []);
    const slotNames = slots.map((s) => s.getAttribute('name'));
    expect(slotNames).toContain('icon');
    expect(slotNames).toContain('description');
    expect(slotNames).toContain(null);
  });

  it('applies base + default size + default state composition', () => {
    const el = mount();
    expect(innerClass(el)).toBe(composeItemClasses('default', false, false));
  });

  it('falls back to default size for unknown values', () => {
    const el = mount({ size: 'huge' });
    expect(innerClass(el)).toContain(itemSizeClasses.default);
  });

  it('reflects size attribute changes to the inner class string', () => {
    const el = mount();
    el.setAttribute('size', 'lg');
    expect(innerClass(el)).toContain(itemSizeClasses.lg);
    el.setAttribute('size', 'sm');
    expect(innerClass(el)).toContain(itemSizeClasses.sm);
  });

  it('applies icon and description part classes to the wrapper spans', () => {
    const el = mount();
    const iconWrap = el.shadowRoot?.querySelector('span[aria-hidden="true"]');
    expect(iconWrap?.className).toBe(itemIconClasses);
    const descSlot = el.shadowRoot?.querySelector('slot[name="description"]');
    const descWrap = descSlot?.parentElement;
    expect(descWrap?.className).toBe(itemDescriptionClasses);
  });

  it('reflects selected attribute to aria-selected and data-selected on inner div', () => {
    const el = mount();
    el.setAttribute('selected', '');
    const inner = innerDiv(el);
    expect(inner?.getAttribute('aria-selected')).toBe('true');
    expect(inner?.hasAttribute('data-selected')).toBe(true);
  });

  it('reflects disabled attribute to aria-disabled, data-disabled, and tabIndex -1', () => {
    const el = mount();
    el.setAttribute('disabled', '');
    const inner = innerDiv(el);
    expect(inner?.getAttribute('aria-disabled')).toBe('true');
    expect(inner?.hasAttribute('data-disabled')).toBe(true);
    expect(inner?.tabIndex).toBe(-1);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'item.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersItem.observedAttributes).toEqual(['size', 'selected', 'disabled']);
  });

  it('sets aria-selected="false" and tabIndex=0 by default', () => {
    const el = mount();
    const inner = innerDiv(el);
    expect(inner?.getAttribute('aria-selected')).toBe('false');
    expect(inner?.tabIndex).toBe(0);
    expect(inner?.hasAttribute('aria-disabled')).toBe(false);
    expect(inner?.hasAttribute('data-selected')).toBe(false);
    expect(inner?.hasAttribute('data-disabled')).toBe(false);
  });

  it('removes data-selected when selected attribute is removed', () => {
    const el = mount({ selected: '' });
    let inner = innerDiv(el);
    expect(inner?.hasAttribute('data-selected')).toBe(true);
    el.removeAttribute('selected');
    inner = innerDiv(el);
    expect(inner?.hasAttribute('data-selected')).toBe(false);
    expect(inner?.getAttribute('aria-selected')).toBe('false');
  });

  it('removes data-disabled and restores tabIndex=0 when disabled is removed', () => {
    const el = mount({ disabled: '' });
    let inner = innerDiv(el);
    expect(inner?.tabIndex).toBe(-1);
    el.removeAttribute('disabled');
    inner = innerDiv(el);
    expect(inner?.tabIndex).toBe(0);
    expect(inner?.hasAttribute('aria-disabled')).toBe(false);
    expect(inner?.hasAttribute('data-disabled')).toBe(false);
  });

  it('keeps the structural :host display shim in component styles', () => {
    expect(RaftersItem.styles).toContain(':host');
    expect(RaftersItem.styles).toContain('display: block');
  });
});
