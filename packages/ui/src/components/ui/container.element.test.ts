import { afterEach, describe, expect, it } from 'vitest';
import './container.element';
import {
  containerArticleTypography,
  containerAutoEdgePadding,
  containerBackgroundClasses,
  containerCenterClasses,
  containerEditableClasses,
  containerGapClasses,
  containerPaddingClasses,
  containerQueryClasses,
  containerSizeClasses,
} from './container.classes';
import { composeContainerClasses, RaftersContainer } from './container.element';
import { gridColSpanClasses, gridRowSpanClasses } from './grid.classes';

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

function innerClass(el: HTMLElement): string {
  return el.shadowRoot?.firstElementChild?.className ?? '';
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

  it('owns only the :host display shim as scoped CSS', () => {
    expect(RaftersContainer.styles).toBe(':host { display: block; }');
  });

  it('inner element always carries the query-container utilities', () => {
    const el = mount('rafters-container');
    expect(innerClass(el)).toContain(containerQueryClasses);
  });

  it('applies the size utility for sized variants and centers them', () => {
    const el = mount('rafters-container', { size: '6xl' });
    expect(innerClass(el)).toContain(containerSizeClasses['6xl']);
    expect(innerClass(el)).toContain(containerCenterClasses);
  });

  it('full size carries the full-width utility and is not centered', () => {
    const el = mount('rafters-container', { size: 'full' });
    expect(innerClass(el)).toContain(containerSizeClasses.full);
    expect(innerClass(el).split(/\s+/)).not.toContain(containerCenterClasses);
  });

  it('applies explicit padding from the spacing scale', () => {
    expect(innerClass(mount('rafters-container', { padding: '6' }))).toContain(
      containerPaddingClasses['6'],
    );
  });

  it('applies responsive auto edge padding for sized containers without explicit padding', () => {
    const el = mount('rafters-container', { size: '4xl' });
    expect(innerClass(el)).toContain(containerAutoEdgePadding);
  });

  it('explicit padding overrides the auto edge padding', () => {
    const el = mount('rafters-container', { size: '4xl', padding: '8' });
    expect(innerClass(el)).toContain(containerPaddingClasses['8']);
    expect(innerClass(el)).not.toContain(containerAutoEdgePadding);
  });

  it('applies the gap flow utilities for explicit gap', () => {
    const el = mount('rafters-container', { gap: '8' });
    expect(innerClass(el)).toContain(containerGapClasses['8']);
  });

  it('derives gap from size when gap attribute is bare', () => {
    // 3xl -> 8 per the size-gap scale.
    const el = mount('rafters-container', { size: '3xl', gap: '' });
    expect(innerClass(el)).toContain(containerGapClasses['8']);
  });

  it('derives default gap of 6 when bare gap and no size', () => {
    const el = mount('rafters-container', { gap: '' });
    expect(innerClass(el)).toContain(containerGapClasses['6']);
  });

  it('applies background utilities for known names', () => {
    const el = mount('rafters-container', { background: 'muted' });
    expect(innerClass(el)).toContain(containerBackgroundClasses.muted);
  });

  it('unknown background falls back to none (no background utility)', () => {
    const el = mount('rafters-container', { background: 'rainbow' });
    expect(innerClass(el)).not.toContain(containerBackgroundClasses.muted);
    expect(innerClass(el)).not.toContain(containerBackgroundClasses.accent);
  });

  it('explicit none background emits no background utility', () => {
    const el = mount('rafters-container', { background: 'none' });
    expect(innerClass(el)).not.toContain(containerBackgroundClasses.muted);
  });

  it('applies the column span utility when placed in a grid', () => {
    const el = mount('rafters-container', { 'col-span': '2' });
    expect(innerClass(el)).toContain(gridColSpanClasses[2]);
  });

  it('applies the row span utility', () => {
    const el = mount('rafters-container', { 'row-span': '2' });
    expect(innerClass(el)).toContain(gridRowSpanClasses[2]);
  });

  it('ignores out-of-range span values', () => {
    const el = mount('rafters-container', { 'col-span': '99', 'row-span': '7' });
    expect(innerClass(el)).not.toContain('col-span-99');
    expect(innerClass(el)).not.toContain('row-span-7');
  });

  it('recomposes the span when col-span changes', () => {
    const el = mount('rafters-container', { 'col-span': '2' });
    expect(innerClass(el)).toContain(gridColSpanClasses[2]);
    el.setAttribute('col-span', '4');
    expect(innerClass(el)).toContain(gridColSpanClasses[4]);
    expect(innerClass(el)).not.toContain(gridColSpanClasses[2]);
  });

  it('article applies the typography utilities', () => {
    const el = mount('rafters-container', { as: 'article' });
    expect(innerClass(el)).toContain(containerArticleTypography);
  });

  it('editable applies the dashed outline utilities', () => {
    const el = mount('rafters-container', { editable: '' });
    expect(innerClass(el)).toContain(containerEditableClasses);
  });

  it('recomposes the inner class string when observed attributes change', () => {
    const el = mount('rafters-container', { size: 'sm' });
    expect(innerClass(el)).toContain(containerSizeClasses.sm);
    el.setAttribute('size', '4xl');
    expect(innerClass(el)).toContain(containerSizeClasses['4xl']);
  });

  it('recomposes when as changes (article toggles typography)', () => {
    const el = mount('rafters-container');
    expect(innerClass(el)).not.toContain(containerArticleTypography);
    el.setAttribute('as', 'article');
    expect(innerClass(el)).toContain(containerArticleTypography);
  });

  it('recomposes when editable is toggled', () => {
    const el = mount('rafters-container');
    expect(innerClass(el)).not.toContain(containerEditableClasses);
    el.setAttribute('editable', '');
    expect(innerClass(el)).toContain(containerEditableClasses);
    el.removeAttribute('editable');
    expect(innerClass(el)).not.toContain(containerEditableClasses);
  });

  it('renders the same composition the helper produces (parity guarantee)', () => {
    const el = mount('rafters-container', {
      as: 'main',
      size: '4xl',
      padding: '6',
      gap: '8',
      background: 'muted',
    });
    expect(innerClass(el)).toBe(
      composeContainerClasses({
        size: '4xl',
        padding: '6',
        gap: '8',
        background: 'muted',
        article: false,
        editable: false,
      }),
    );
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
      'col-span',
      'row-span',
      'position',
      'depth',
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
