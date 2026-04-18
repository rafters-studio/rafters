import { afterEach, describe, expect, it } from 'vitest';
import './label.element';
import { RaftersLabel } from './label.element';

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

describe('<rafters-label>', () => {
  it('registers the rafters-label tag on import', () => {
    expect(customElements.get('rafters-label')).toBe(RaftersLabel);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./label.element')).resolves.toBeDefined();
    await expect(import('./label.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-label')).toBe(RaftersLabel);
  });

  it('renders a single label.label containing a slot', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label.label');
    expect(inner).not.toBeNull();
    expect(inner?.tagName.toLowerCase()).toBe('label');
    expect(inner?.children.length).toBe(1);
    expect(inner?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('falls back to default variant for unknown values', () => {
    const el = document.createElement('rafters-label');
    el.setAttribute('variant', 'nonsense');
    document.body.appendChild(el);
    const defaultEl = document.createElement('rafters-label');
    document.body.appendChild(defaultEl);
    expect(adoptedCssText(el)).toBe(adoptedCssText(defaultEl));
    expect(adoptedCssText(el)).toContain('color-foreground');
  });

  it('reflects variant attribute changes to the adopted stylesheet', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    el.setAttribute('variant', 'destructive');
    expect(adoptedCssText(el)).toContain('color-destructive');
  });

  it('forwards the for attribute to the inner label element', () => {
    const el = document.createElement('rafters-label');
    el.setAttribute('for', 'email');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label.label');
    expect(inner?.getAttribute('for')).toBe('email');
  });

  it('updates the inner for attribute when the host attribute changes', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label.label');
    expect(inner?.getAttribute('for')).toBeNull();
    el.setAttribute('for', 'email');
    expect(inner?.getAttribute('for')).toBe('email');
    el.removeAttribute('for');
    expect(inner?.getAttribute('for')).toBeNull();
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'label.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersLabel.observedAttributes).toEqual(['variant', 'for']);
  });
});
