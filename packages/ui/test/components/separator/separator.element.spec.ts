/**
 * Web Component performance of the Separator score. Separator is a static
 * score (role/orientation are a pure function of config), so there is no
 * controller to drive. The WC renders the rule markup with the shared classes
 * and paints the resolved aria projection, once. `decorative` is
 * presence-based here (attribute semantics, faithful to the oracle).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { separator } from '../../../src/components/separator/separator.behavior';
import { RaftersSeparator } from '../../../src/components/separator/separator.element';

beforeAll(() => {
  if (!customElements.get('rafters-separator')) {
    customElements.define('rafters-separator', RaftersSeparator);
  }
});

function mount(attrs = ''): HTMLElement {
  document.body.innerHTML = `<main><rafters-separator ${attrs}></rafters-separator></main>`;
  return document.body.querySelector('rafters-separator') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

/** Asserts the rendered role/aria-orientation equal the score's projection
 *  for `root` -- including absence: a projected undefined attr must not
 *  render. */
function assertAria(el: HTMLElement, config: Parameters<typeof separator.aria>[1]): void {
  const projected = separator.aria({}, config, { root: el.id }).root ?? {};
  for (const [attr, expected] of Object.entries(projected)) {
    if (expected === undefined) {
      expect(el.hasAttribute(attr), `must NOT render ${attr}`).toBe(false);
    } else {
      expect(el.getAttribute(attr), attr).toBe(String(expected));
    }
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('separator [wc]', () => {
  it('renders a root rule carrying the shared classes', () => {
    const root = shadowRoot(mount());
    expect(root).not.toBeNull();
    expect(root.className).toContain('shrink-0');
    expect(root.className).toContain('bg-border');
    expect(root.className).toContain('h-px w-full');
  });

  it('fulfills the contract by default: decorative rule projects role="none"', () => {
    const root = shadowRoot(mount());
    assertAria(root, { orientation: 'horizontal', decorative: true });
    expect(root.getAttribute('role')).toBe('none');
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('a present decorative attribute opts into the semantic role/aria-orientation pair', () => {
    const host = mount();
    host.setAttribute('decorative', '');
    const root = shadowRoot(host);
    assertAria(root, { orientation: 'horizontal', decorative: false });
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('decorative="false" stays decorative -- faithful to the oracle contract', () => {
    const host = mount('decorative="false"');
    const root = shadowRoot(host);
    expect(root.getAttribute('role')).toBe('none');
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('aria-orientation mirrors orientation for a semantic rule', () => {
    const host = mount('decorative orientation="vertical"');
    const root = shadowRoot(host);
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('orientation flips the visual axis through the same projection', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('h-px w-full');
    host.setAttribute('orientation', 'vertical');
    expect(shadowRoot(host).className).toContain('h-full w-px');
  });

  it('falls back to horizontal for an unknown orientation', () => {
    const root = shadowRoot(mount('orientation="diagonal"'));
    expect(root.className).toContain('h-px w-full');
  });

  it('only root is a declared part and there is no slot -- a rule has no content', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
    expect(host.shadowRoot?.querySelector('slot')).toBeNull();
  });
});
