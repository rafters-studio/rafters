import { afterEach, describe, expect, it } from 'vitest';
import { RaftersEmpty } from './empty.element';

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

describe('<rafters-empty>', () => {
  it('registers the rafters-empty tag on import', () => {
    expect(customElements.get('rafters-empty')).toBe(RaftersEmpty);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./empty.element')).resolves.toBeDefined();
    await expect(import('./empty.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-empty')).toBe(RaftersEmpty);
  });

  it('renders a single div.empty containing a slot', () => {
    const el = document.createElement('rafters-empty');
    document.body.appendChild(el);
    const root = el.shadowRoot?.querySelector('div.empty');
    expect(root).not.toBeNull();
    expect(root?.children.length).toBe(1);
    expect(root?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('observedAttributes is an empty array', () => {
    expect(Array.from(RaftersEmpty.observedAttributes)).toEqual([]);
  });

  it('adopts the empty stylesheet on connect', () => {
    const el = document.createElement('rafters-empty');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
    const css = adoptedCssText(el);
    expect(css).toContain('.empty');
  });

  it('adopted stylesheet resolves token references via var()', () => {
    const el = document.createElement('rafters-empty');
    document.body.appendChild(el);
    const css = adoptedCssText(el);
    // Base container uses spacing tokens for gap and padding.
    expect(css).toContain('var(--spacing-4)');
    expect(css).toContain('var(--spacing-12)');
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens', () => {
    const el = document.createElement('rafters-empty');
    document.body.appendChild(el);
    const css = adoptedCssText(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('clears the instance stylesheet on disconnect', () => {
    const el = document.createElement('rafters-empty');
    document.body.appendChild(el);
    el.remove();
    // After disconnect, re-connecting yields a fresh sheet without throwing.
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'empty.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
