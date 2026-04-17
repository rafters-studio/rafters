import { afterEach, describe, expect, it } from 'vitest';
import './grid.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('rafters-grid', () => {
  it('auto-registers on import', () => {
    expect(customElements.get('rafters-grid')).toBeDefined();
  });

  it('renders a div.grid containing a slot', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    const grid = host.shadowRoot?.querySelector('div.grid');
    expect(grid).not.toBeNull();
    expect(grid?.querySelector('slot')).not.toBeNull();
  });

  it('defaults to cols=1, gap=4, flow=row', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    const sheet = host.shadowRoot?.adoptedStyleSheets.at(-1);
    const css = Array.from(sheet?.cssRules ?? [])
      .map((r) => r.cssText)
      .join('\n');
    expect(css).toContain('repeat(1, minmax(0, 1fr))');
    expect(css).toContain('var(--spacing-4)');
    expect(css).toContain('grid-auto-flow: row');
  });

  it('regenerates stylesheet when cols changes, without rebuilding DOM', () => {
    const host = document.createElement('rafters-grid');
    document.body.appendChild(host);
    const initialDiv = host.shadowRoot?.querySelector('div.grid');
    host.setAttribute('cols', '6');
    const finalDiv = host.shadowRoot?.querySelector('div.grid');
    expect(finalDiv).toBe(initialDiv);
    const sheet = host.shadowRoot?.adoptedStyleSheets.at(-1);
    const css = Array.from(sheet?.cssRules ?? [])
      .map((r) => r.cssText)
      .join('\n');
    expect(css).toContain('@container (min-width: 80rem)');
    expect(css).toContain('repeat(6, minmax(0, 1fr))');
  });

  it('falls back to defaults for invalid attribute values without throwing', () => {
    const host = document.createElement('rafters-grid');
    expect(() => {
      host.setAttribute('cols', 'banana');
      host.setAttribute('gap', '999');
      host.setAttribute('flow', 'sideways');
      document.body.appendChild(host);
    }).not.toThrow();
    const sheet = host.shadowRoot?.adoptedStyleSheets.at(-1);
    const css = Array.from(sheet?.cssRules ?? [])
      .map((r) => r.cssText)
      .join('\n');
    expect(css).toContain('repeat(1, minmax(0, 1fr))');
  });

  it('does not throw when module is re-imported', async () => {
    await expect(import('./grid.element')).resolves.toBeDefined();
  });
});
