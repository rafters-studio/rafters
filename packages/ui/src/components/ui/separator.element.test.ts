import { afterEach, describe, expect, it } from 'vitest';
import './separator.element';
import { RaftersSeparator } from './separator.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-separator');
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

describe('<rafters-separator>', () => {
  it('registers the rafters-separator tag on import', () => {
    expect(customElements.get('rafters-separator')).toBe(RaftersSeparator);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./separator.element')).resolves.toBeDefined();
    await expect(import('./separator.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-separator')).toBe(RaftersSeparator);
  });

  it('renders a single div.separator with role="none" by default (decorative)', () => {
    const el = mount();
    const inner = el.shadowRoot?.querySelector('div.separator');
    expect(inner).not.toBeNull();
    expect(inner?.getAttribute('role')).toBe('none');
    expect(inner?.hasAttribute('aria-orientation')).toBe(false);
    expect(inner?.classList.contains('orientation-horizontal')).toBe(true);
    // Separator has no slotted content.
    expect(el.shadowRoot?.querySelector('slot')).toBeNull();
  });

  it('falls back to horizontal orientation for unknown values', () => {
    const el = mount({ orientation: 'diagonal' });
    const inner = el.shadowRoot?.querySelector('div.separator');
    expect(inner?.classList.contains('orientation-horizontal')).toBe(true);
    const css = adoptedCssText(el);
    expect(css).toMatch(/height:\s*1px/);
    expect(css).toMatch(/width:\s*100%/);
  });

  it('reflects orientation changes to class and adopted stylesheet', () => {
    const el = mount();
    el.setAttribute('orientation', 'vertical');
    const inner = el.shadowRoot?.querySelector('div.separator');
    expect(inner?.classList.contains('orientation-vertical')).toBe(true);
    expect(inner?.classList.contains('orientation-horizontal')).toBe(false);
    const css = adoptedCssText(el);
    expect(css).toMatch(/height:\s*100%/);
    expect(css).toMatch(/width:\s*1px/);
  });

  it('reflects decorative="false" by setting role="separator" and aria-orientation', () => {
    const el = mount();
    el.setAttribute('decorative', 'false');
    // `decorative="false"` keeps the separator decorative (aria-hidden from AT).
    const innerAfterFalse = el.shadowRoot?.querySelector('div.separator');
    expect(innerAfterFalse?.getAttribute('role')).toBe('none');
    expect(innerAfterFalse?.hasAttribute('aria-orientation')).toBe(false);

    // Setting decorative to any non-"false" value (including empty string)
    // opts into the non-decorative role/aria-orientation pair.
    el.setAttribute('decorative', '');
    const innerAfterPresent = el.shadowRoot?.querySelector('div.separator');
    expect(innerAfterPresent?.getAttribute('role')).toBe('separator');
    expect(innerAfterPresent?.getAttribute('aria-orientation')).toBe('horizontal');

    // aria-orientation mirrors the current orientation.
    el.setAttribute('orientation', 'vertical');
    const innerVertical = el.shadowRoot?.querySelector('div.separator');
    expect(innerVertical?.getAttribute('role')).toBe('separator');
    expect(innerVertical?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersSeparator.observedAttributes).toEqual(['orientation', 'decorative']);
  });

  it('shadow root adopts the per-instance stylesheet', () => {
    const el = mount();
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBe(1);
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens', () => {
    const el = mount();
    const css = adoptedCssText(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'separator.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
