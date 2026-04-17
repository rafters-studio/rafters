import { afterEach, describe, expect, it } from 'vitest';
import { RaftersBadge } from './badge.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

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

describe('<rafters-badge>', () => {
  it('registers the rafters-badge tag on import', () => {
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./badge.element')).resolves.toBeDefined();
    await expect(import('./badge.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('renders a single span.badge containing a slot', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    const span = el.shadowRoot?.querySelector('span.badge');
    expect(span).not.toBeNull();
    expect(span?.children.length).toBe(1);
    expect(span?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('falls back to default variant for unknown values', () => {
    const el = document.createElement('rafters-badge');
    el.setAttribute('variant', 'nonsense');
    document.body.appendChild(el);
    expect(adoptedCssText(el)).toContain('color-primary');
  });

  it('falls back to default size for unknown values', () => {
    const el = document.createElement('rafters-badge');
    el.setAttribute('size', 'gigantic');
    document.body.appendChild(el);
    expect(adoptedCssText(el)).toContain('font-size-label-small');
  });

  it('reflects variant attribute changes to the adopted stylesheet', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    el.setAttribute('variant', 'destructive');
    expect(adoptedCssText(el)).toContain('color-destructive');
  });

  it('reflects size attribute changes to the adopted stylesheet', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    el.setAttribute('size', 'lg');
    expect(adoptedCssText(el)).toContain('font-size-label-medium');
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'badge.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });
});
