/**
 * Tests for <rafters-typography> Web Component.
 *
 * Assertions check rendered semantic tag per variant, fallback behavior,
 * idempotent registration, and that TypographyTokenProps attributes compose
 * the matching utility classes onto the inner element -- parity with the
 * React/Astro targets via resolveTypography.
 */

import { afterEach, describe, expect, it } from 'vitest';
import './typography.element';
import { resolveTypography } from './typography.classes';
import { composeTypographyClasses, RaftersTypography } from './typography.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function innerEl(el: Element): Element | null {
  return el.shadowRoot?.firstElementChild ?? null;
}

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

  it('default p variant composes the shared p class string onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).toBe(composeTypographyClasses('p'));
  });

  it('size attribute composes the font-size override class onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('size', 'xl');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).toContain('text-xl');
    expect(innerEl(el)?.className).toBe(composeTypographyClasses('p', { size: 'xl' }));
  });

  it('color attribute composes the color override class onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('color', 'muted-foreground');
    document.body.appendChild(el);
    const expected = resolveTypography('p', { color: 'muted-foreground' });
    expect(innerEl(el)?.className).toBe(expected);
  });

  it('h1 variant composes the h1 default class string onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('variant', 'h1');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).toBe(composeTypographyClasses('h1'));
  });

  it('align attribute composes the text-align utility onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('align', 'center');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).toContain('text-center');
  });

  it('transform attribute composes the literal transform utility onto the inner element', () => {
    const el = document.createElement('rafters-typography');
    el.setAttribute('transform', 'uppercase');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).toContain('uppercase');
  });

  it('changing a TypographyTokenProps attribute updates the inner class string', () => {
    const el = document.createElement('rafters-typography');
    document.body.appendChild(el);
    expect(innerEl(el)?.className).not.toContain('font-bold');

    el.setAttribute('weight', 'bold');
    expect(innerEl(el)?.className).toContain('font-bold');
  });
});
