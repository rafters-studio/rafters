/**
 * Web Component performance of the Typography score -- the SAME static score as
 * the React and Astro conformances, so there is no controller to drive. These
 * assertions prove the one contract (the variant's semantic tag renders in the
 * shadow root with the shared composed classes and data-part="root", slotted
 * content projects through, the surface is axe-clean) holds in the shadow-DOM
 * performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersTypography } from '../../../src/components/typography/typography.element';

beforeAll(() => {
  if (!customElements.get('rafters-typography')) {
    customElements.define('rafters-typography', RaftersTypography);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<main><rafters-typography ${attrs}>${slots}</rafters-typography></main>`;
  return document.body.querySelector('rafters-typography') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('typography conformance [wc]', () => {
  it('the variant drives the semantic tag of the shadow root', () => {
    const root = shadowRoot(mount('variant="h1"', 'Title'));
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('h1');
    expect(root.getAttribute('data-part')).toBe('root');
  });

  it('the root carries the shared composed classes', () => {
    const root = shadowRoot(mount('variant="h1"', 'Title'));
    expect(root.className).toContain('text-4xl');
    expect(root.className).toContain('@lg:text-5xl');
  });

  it('token-prop attributes override the variant default', () => {
    const root = shadowRoot(mount('variant="h1" size="2xl"', 'Title'));
    expect(root.className).toContain('text-2xl');
    expect(root.className).not.toContain('text-4xl');
    expect(root.className).not.toContain('@lg:text-5xl');
  });

  it('codeblock nests a code element inside the pre root', () => {
    const root = shadowRoot(mount('variant="codeblock"', 'const x = 1;'));
    expect(root.tagName.toLowerCase()).toBe('pre');
    expect(root.querySelector('code')).not.toBeNull();
  });

  it('an unknown variant falls back to p -- never throws', () => {
    const root = shadowRoot(mount('variant="display"', 'body'));
    expect(root.tagName.toLowerCase()).toBe('p');
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('variant="p"', 'Body');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Body');
  });

  it('is axe-clean inside a landmark', async () => {
    document.body.innerHTML =
      '<main><rafters-typography variant="h1">Doc title</rafters-typography><rafters-typography variant="p">Body.</rafters-typography></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
