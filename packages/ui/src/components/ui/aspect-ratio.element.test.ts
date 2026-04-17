import { afterEach, describe, expect, it } from 'vitest';
import './aspect-ratio.element';
import { RaftersAspectRatio } from './aspect-ratio.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-aspect-ratio');
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

describe('<rafters-aspect-ratio>', () => {
  it('registers the rafters-aspect-ratio tag on import', () => {
    expect(customElements.get('rafters-aspect-ratio')).toBe(RaftersAspectRatio);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./aspect-ratio.element')).resolves.toBeDefined();
    await expect(import('./aspect-ratio.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-aspect-ratio')).toBe(RaftersAspectRatio);
  });

  it('renders a single div.aspect-ratio containing a slot', () => {
    const el = mount();
    const root = el.shadowRoot;
    expect(root).not.toBeNull();
    // Exactly one top-level child in the shadow root.
    expect(root?.childNodes.length).toBe(1);
    const inner = root?.querySelector('div.aspect-ratio');
    expect(inner).not.toBeNull();
    expect(inner?.children.length).toBe(1);
    expect(inner?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('falls back to ratio 1 for missing, non-numeric, or non-positive values', () => {
    // Missing attribute.
    const missing = mount();
    expect(adoptedCssText(missing)).toMatch(/aspect-ratio:\s*1(?!\.)/);

    // Non-numeric string.
    const nonNumeric = mount({ ratio: 'foo' });
    expect(adoptedCssText(nonNumeric)).toMatch(/aspect-ratio:\s*1(?!\.)/);

    // Negative number.
    const negative = mount({ ratio: '-1' });
    expect(adoptedCssText(negative)).toMatch(/aspect-ratio:\s*1(?!\.)/);

    // Zero.
    const zero = mount({ ratio: '0' });
    expect(adoptedCssText(zero)).toMatch(/aspect-ratio:\s*1(?!\.)/);
  });

  it('parses fractional ratio strings like "16/9"', () => {
    const el = mount({ ratio: '16/9' });
    const css = adoptedCssText(el);
    // 16 / 9 = 1.7777777777777777
    expect(css).toContain(`aspect-ratio: ${String(16 / 9)}`);
  });

  it('reflects ratio attribute changes to the adopted stylesheet', () => {
    const el = mount({ ratio: '1' });
    expect(adoptedCssText(el)).toMatch(/aspect-ratio:\s*1(?!\.)/);
    el.setAttribute('ratio', '4/3');
    const css = adoptedCssText(el);
    expect(css).toContain(`aspect-ratio: ${String(4 / 3)}`);
    expect(css).not.toMatch(/aspect-ratio:\s*1;/);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'aspect-ratio.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
