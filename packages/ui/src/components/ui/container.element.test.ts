import { afterEach, describe, expect, it } from 'vitest';
import './container.element';
import { RaftersContainer } from './container.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function collectCss(el: HTMLElement): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  return sheets
    .map((s) =>
      Array.from(s.cssRules)
        .map((r) => r.cssText)
        .join('\n'),
    )
    .join('\n');
}

describe('rafters-container', () => {
  it('registers the custom element', () => {
    expect(customElements.get('rafters-container')).toBeDefined();
  });

  it('exports RaftersContainer as the registered constructor', () => {
    expect(customElements.get('rafters-container')).toBe(RaftersContainer);
  });

  it('defaults to a div in the shadow root', () => {
    const el = mount('rafters-container');
    expect(el.shadowRoot?.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders the requested semantic element', () => {
    const el = mount('rafters-container', { as: 'main' });
    expect(el.shadowRoot?.firstElementChild?.tagName).toBe('MAIN');
  });

  it('renders section / article / aside semantic elements', () => {
    expect(
      mount('rafters-container', { as: 'section' }).shadowRoot?.firstElementChild?.tagName,
    ).toBe('SECTION');
    expect(
      mount('rafters-container', { as: 'article' }).shadowRoot?.firstElementChild?.tagName,
    ).toBe('ARTICLE');
    expect(mount('rafters-container', { as: 'aside' }).shadowRoot?.firstElementChild?.tagName).toBe(
      'ASIDE',
    );
  });

  it('falls back to div for unknown as values', () => {
    const el = mount('rafters-container', { as: 'bogus' });
    expect(el.shadowRoot?.firstElementChild?.tagName).toBe('DIV');
  });

  it('exposes a default slot', () => {
    const el = mount('rafters-container');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  it('inner element carries the .container class', () => {
    const el = mount('rafters-container');
    const inner = el.shadowRoot?.firstElementChild;
    expect(inner?.classList.contains('container')).toBe(true);
  });

  it('sets host to inline-size container with width 100 percent', () => {
    const css = collectCss(mount('rafters-container'));
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/:host\s*\{[^}]*container-type:\s*inline-size/);
    expect(css).toMatch(/:host\s*\{[^}]*width:\s*100%/);
  });

  it('applies size max-width via token var', () => {
    const css = collectCss(mount('rafters-container', { size: '6xl' }));
    expect(css).toContain('var(--size-container-6xl)');
    expect(css).toMatch(/margin-inline:\s*auto/);
  });

  it('full size yields width 100 percent with no max-width', () => {
    const css = collectCss(mount('rafters-container', { size: 'full' }));
    expect(css).not.toContain('var(--size-container-full)');
    expect(css).toMatch(/width:\s*100%/);
  });

  it('applies padding from spacing scale', () => {
    expect(collectCss(mount('rafters-container', { padding: '6' }))).toContain('var(--spacing-6)');
  });

  it('applies gap as flex-column with token spacing', () => {
    const css = collectCss(mount('rafters-container', { gap: '8' }));
    expect(css).toContain('var(--spacing-8)');
    expect(css).toMatch(/display:\s*flex/);
    expect(css).toMatch(/flex-direction:\s*column/);
  });

  it('derives gap from size when gap attribute is bare', () => {
    const css = collectCss(mount('rafters-container', { size: '3xl', gap: '' }));
    expect(css).toContain('var(--spacing-8)');
  });

  it('derives default gap of 6 when bare gap and no size', () => {
    const css = collectCss(mount('rafters-container', { gap: '' }));
    expect(css).toContain('var(--spacing-6)');
  });

  it('applies background tokens for known names', () => {
    const css = collectCss(mount('rafters-container', { background: 'muted' }));
    expect(css).toContain('var(--color-muted)');
    expect(css).toContain('var(--color-muted-foreground)');
  });

  it('unknown background falls back to none', () => {
    const css = collectCss(mount('rafters-container', { background: 'rainbow' }));
    expect(css).not.toMatch(/background-color:\s*var\(--color-/);
  });

  it('explicit none background emits no background-color rule', () => {
    const css = collectCss(mount('rafters-container', { background: 'none' }));
    expect(css).not.toMatch(/background-color:\s*var\(--color-/);
  });

  it('article applies typography to descendant selectors via tokens only', () => {
    const css = collectCss(mount('rafters-container', { as: 'article' }));
    expect(css).toMatch(/p\s*\{/);
    expect(css).toMatch(/h1\s*\{/);
    expect(css).toMatch(/blockquote\s*\{/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  it('editable applies dashed outline in muted-foreground at 30 percent', () => {
    const css = collectCss(mount('rafters-container', { editable: '' }));
    expect(css).toMatch(/outline-style:\s*dashed/);
    expect(css).toContain('color-mix(in oklch, var(--color-muted-foreground) 30%, transparent)');
  });

  it('rebuilds stylesheet when observed attributes change', () => {
    const el = mount('rafters-container', { size: 'sm' });
    expect(collectCss(el)).toContain('var(--size-container-sm)');
    el.setAttribute('size', '4xl');
    expect(collectCss(el)).toContain('var(--size-container-4xl)');
  });

  it('rebuilds when as changes (article toggles typography)', () => {
    const el = mount('rafters-container');
    expect(collectCss(el)).not.toMatch(/blockquote\s*\{/);
    el.setAttribute('as', 'article');
    expect(collectCss(el)).toMatch(/blockquote\s*\{/);
  });

  it('rebuilds when editable is toggled', () => {
    const el = mount('rafters-container');
    expect(collectCss(el)).not.toMatch(/outline-style:\s*dashed/);
    el.setAttribute('editable', '');
    expect(collectCss(el)).toMatch(/outline-style:\s*dashed/);
    el.removeAttribute('editable');
    expect(collectCss(el)).not.toMatch(/outline-style:\s*dashed/);
  });

  it('motion uses --motion-duration tokens, never --duration', () => {
    const css = collectCss(mount('rafters-container'));
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('importing the module twice does not throw', async () => {
    await import('./container.element');
    await import('./container.element');
    expect(customElements.get('rafters-container')).toBe(RaftersContainer);
  });

  it('observedAttributes contains exactly the documented attributes', () => {
    expect(RaftersContainer.observedAttributes).toEqual([
      'as',
      'size',
      'padding',
      'gap',
      'background',
      'editable',
    ]);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'container.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });
});
