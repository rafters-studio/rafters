/**
 * Tests for <rafters-typography> Web Component.
 *
 * Uses happy-dom (vitest default for this workspace). Shadow DOM and
 * adoptedStyleSheets are both supported.
 *
 * Assertions check rendered semantic tag per variant, fallback behavior,
 * idempotent registration, and that TypographyTokenProps attributes inject
 * token references into the shadow stylesheet (values need not resolve --
 * resolver work is tracked separately).
 */

import { afterEach, describe, expect, it } from 'vitest';
import './typography.element';
import { RaftersTypography } from './typography.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('rafters-typography', () => {
  it('registers as rafters-typography', () => {
    expect(customElements.get('rafters-typography')).toBeDefined();
  });

  it('registered constructor is RaftersTypography', () => {
    expect(customElements.get('rafters-typography')).toBe(RaftersTypography);
  });

  it('idempotent registration -- second import does not throw', async () => {
    await expect(import('./typography.element')).resolves.toBeDefined();
  });

  it('defaults to <p> when variant attribute is absent', () => {
    const el = document.createElement('rafters-typography');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('p')).not.toBeNull();
  });

  it('renders <h1> when variant="h1"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h1');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('h1')).not.toBeNull();
  });

  it('renders <h2> when variant="h2"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h2');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('h2')).not.toBeNull();
  });

  it('renders <h3> when variant="h3"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h3');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('h3')).not.toBeNull();
  });

  it('renders <h4> when variant="h4"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h4');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('h4')).not.toBeNull();
  });

  it('renders <small> when variant="small"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'small');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('small')).not.toBeNull();
  });

  it('renders <code> when variant="code"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'code');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('code')).not.toBeNull();
  });

  it('renders <blockquote> when variant="blockquote"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'blockquote');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('blockquote')).not.toBeNull();
  });

  it('renders <ul> when variant="ul"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'ul');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('ul')).not.toBeNull();
  });

  it('renders <ol> when variant="ol"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'ol');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('ol')).not.toBeNull();
  });

  it('renders <li> when variant="li"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'li');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('li')).not.toBeNull();
  });

  it('renders <mark> when variant="mark"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'mark');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('mark')).not.toBeNull();
  });

  it('renders <abbr> when variant="abbr"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'abbr');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('abbr')).not.toBeNull();
  });

  it('renders <p> when variant is one of the paragraph-based variants', () => {
    for (const variant of ['lead', 'large', 'muted']) {
      const el = document.createElement('rafters-typography');
      el.setAttribute('variant', variant);
      document.body.appendChild(el);
      expect(el.shadowRoot?.querySelector('p')).not.toBeNull();
      document.body.removeChild(el);
    }
  });

  it('renders pre>code when variant="codeblock"', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'codeblock');
    document.body.appendChild(el);
    const pre = el.shadowRoot?.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.querySelector('code')).not.toBeNull();
  });

  it('codeblock contains a <slot> inside the <code> element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'codeblock');
    document.body.appendChild(el);
    const code = el.shadowRoot?.querySelector('pre > code');
    expect(code).not.toBeNull();
    expect(code?.querySelector('slot')).not.toBeNull();
  });

  it('falls back to <p> on unknown variant', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'totally-bogus');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('p')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('h1')).toBeNull();
  });

  it('does not throw on unknown variant', () => {
    const el = document.createElement('rafters-typography');
    expect(() => {
      el.setAttribute('variant', 'nonsense');
      document.body.appendChild(el);
    }).not.toThrow();
  });

  it('rerenders semantic tag when variant attribute changes', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h1');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('h1')).not.toBeNull();
    el.setAttribute('variant', 'h2');
    expect(el.shadowRoot?.querySelector('h1')).toBeNull();
    expect(el.shadowRoot?.querySelector('h2')).not.toBeNull();
  });

  it('contains a single <slot> for projected children (non-codeblock variants)', () => {
    const el = document.createElement('rafters-typography');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelectorAll('slot').length).toBe(1);
  });

  it('observes all TypographyTokenProps attributes', () => {
    const ctor = customElements.get('rafters-typography') as typeof HTMLElement & {
      observedAttributes: string[];
    };
    const observed = ctor.observedAttributes;
    for (const attr of [
      'variant',
      'size',
      'weight',
      'color',
      'line',
      'tracking',
      'family',
      'align',
      'transform',
    ]) {
      expect(observed).toContain(attr);
    }
  });

  it('size attribute injects font-size override into shadow stylesheet', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('size', 'xl');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('var(--font-size-xl)');
  });

  it('color attribute injects color override into shadow stylesheet', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('color', 'muted-foreground');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('var(--color-muted-foreground)');
  });

  it('h1 variant emits display-large composite token references', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h1');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('var(--font-display-large-size)');
  });

  it('align attribute emits a literal text-align value into the shadow stylesheet', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('align', 'center');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('text-align: center');
  });

  it('transform attribute emits a literal text-transform value into the shadow stylesheet', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('transform', 'uppercase');
    document.body.appendChild(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('text-transform: uppercase');
  });

  it('changing a TypographyTokenProps attribute updates the shadow stylesheet', () => {
    const el = document.createElement('rafters-typography');
    document.body.appendChild(el);

    let sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    let allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).not.toContain('var(--font-weight-bold)');

    el.setAttribute('weight', 'bold');
    sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    allCss = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(allCss).toContain('var(--font-weight-bold)');
  });
});
