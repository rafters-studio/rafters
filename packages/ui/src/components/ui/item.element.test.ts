import { afterEach, describe, expect, it } from 'vitest';
import './item.element';
import { RaftersItem } from './item.element';

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

function adoptedCssText(el: Element): string {
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

describe('<rafters-item>', () => {
  it('registers the rafters-item tag on import', () => {
    expect(customElements.get('rafters-item')).toBe(RaftersItem);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./item.element')).resolves.toBeDefined();
    await expect(import('./item.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-item')).toBe(RaftersItem);
  });

  it('renders a div.item[role=option] with icon + default + description slots', () => {
    const el = mount();
    const inner = el.shadowRoot?.querySelector('div.item');
    expect(inner).not.toBeNull();
    expect(inner?.getAttribute('role')).toBe('option');
    const slots = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []);
    const slotNames = slots.map((s) => s.getAttribute('name'));
    expect(slotNames).toContain('icon');
    expect(slotNames).toContain('description');
    expect(slotNames).toContain(null);
  });

  it('falls back to default size for unknown values', () => {
    const el = mount({ size: 'huge' });
    expect(adoptedCssText(el)).toContain('font-size-body-small');
  });

  it('reflects selected attribute to aria-selected and data-selected on inner div', () => {
    const el = mount();
    el.setAttribute('selected', '');
    const inner = el.shadowRoot?.querySelector('div.item');
    expect(inner?.getAttribute('aria-selected')).toBe('true');
    expect(inner?.hasAttribute('data-selected')).toBe(true);
  });

  it('reflects disabled attribute to aria-disabled, data-disabled, and tabIndex -1', () => {
    const el = mount();
    el.setAttribute('disabled', '');
    const inner = el.shadowRoot?.querySelector('div.item');
    expect(inner?.getAttribute('aria-disabled')).toBe('true');
    expect(inner?.hasAttribute('data-disabled')).toBe(true);
    expect((inner as HTMLElement | null)?.tabIndex).toBe(-1);
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
    const inner = el.shadowRoot?.querySelector('div.item');
    expect(inner?.getAttribute('aria-selected')).toBe('false');
    expect((inner as HTMLElement | null)?.tabIndex).toBe(0);
    expect(inner?.hasAttribute('aria-disabled')).toBe(false);
    expect(inner?.hasAttribute('data-selected')).toBe(false);
    expect(inner?.hasAttribute('data-disabled')).toBe(false);
  });

  it('re-resolves adopted stylesheet when size attribute changes', () => {
    const el = mount();
    el.setAttribute('size', 'lg');
    expect(adoptedCssText(el)).toContain('font-size-body-medium');
    el.setAttribute('size', 'sm');
    expect(adoptedCssText(el)).toContain('font-size-label-small');
  });

  it('removes data-selected when selected attribute is removed', () => {
    const el = mount({ selected: '' });
    let inner = el.shadowRoot?.querySelector('div.item');
    expect(inner?.hasAttribute('data-selected')).toBe(true);
    el.removeAttribute('selected');
    inner = el.shadowRoot?.querySelector('div.item');
    expect(inner?.hasAttribute('data-selected')).toBe(false);
    expect(inner?.getAttribute('aria-selected')).toBe('false');
  });

  it('removes data-disabled and restores tabIndex=0 when disabled is removed', () => {
    const el = mount({ disabled: '' });
    let inner = el.shadowRoot?.querySelector('div.item');
    expect((inner as HTMLElement | null)?.tabIndex).toBe(-1);
    el.removeAttribute('disabled');
    inner = el.shadowRoot?.querySelector('div.item');
    expect((inner as HTMLElement | null)?.tabIndex).toBe(0);
    expect(inner?.hasAttribute('aria-disabled')).toBe(false);
    expect(inner?.hasAttribute('data-disabled')).toBe(false);
  });

  it('shadow root adopts the per-instance stylesheet', () => {
    const el = mount();
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens', () => {
    const el = mount();
    const css = adoptedCssText(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });
});
