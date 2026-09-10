/**
 * Web Component performance of the Breadcrumb score. The SAME score as the
 * React and Astro conformances -- but Breadcrumb is a PURE STATIC, so there is
 * no controller to drive. Like Container, the root IS the semantic nav
 * landmark, so the element creates that tag inside its shadow root and the host
 * is display:contents -- the landmark, not the custom element, is the box. The
 * list/item/link/page/separator/ellipsis family is consumer-composed light DOM
 * projected through the default slot. These assertions prove the one contract
 * (the nav landmark renders with its fixed label, slotted content projects
 * through) holds in the shadow-DOM performance too. Axe cleanliness for this
 * markup is asserted in the .a11y tier, not here.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersBreadcrumb } from '../../../src/components/breadcrumb/breadcrumb.element';
import { breadcrumb } from '../../../src/components/breadcrumb/breadcrumb.behavior';

const TRAIL = `
  <ol class="flex flex-wrap items-center gap-1.5">
    <li class="inline-flex items-center gap-1.5"><a href="/">Home</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5">
      <span role="link" aria-disabled="true" aria-current="page">Widget</span>
    </li>
  </ol>
`;

beforeAll(() => {
  if (!customElements.get('rafters-breadcrumb')) {
    customElements.define('rafters-breadcrumb', RaftersBreadcrumb);
  }
});

function mount(slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-breadcrumb>${slots}</rafters-breadcrumb>`;
  return document.body.querySelector('rafters-breadcrumb') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('breadcrumb [wc]', () => {
  it('the root IS the nav landmark labelled "Breadcrumb"', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('fulfills the contract: root projects NO ARIA role (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root, 'declared part "root" must be rendered').not.toBeNull();
    expect(breadcrumb.aria({}, {}, { root: root.id }).root).toEqual({});
    expect(root.getAttribute('role')).toBeNull();
  });

  it('renders a single nav containing exactly one default slot', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root.children.length).toBe(1);
    expect(root.firstElementChild?.tagName.toLowerCase()).toBe('slot');
    expect(root.querySelector('slot')?.getAttribute('name')).toBeNull();
  });

  it('observedAttributes is empty -- there is nothing attribute-driven', () => {
    expect(RaftersBreadcrumb.observedAttributes).toEqual([]);
  });

  it('keeps the irreducible host display:contents rule in the adopted sheet', () => {
    const host = mount();
    const sheets = host.shadowRoot?.adoptedStyleSheets ?? [];
    const css = sheets
      .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
      .join('\n');
    expect(css).toMatch(/:host\s*{[^}]*display:\s*contents/);
  });

  it('slotted light-DOM trail passes through and keeps its earned semantics', () => {
    const host = mount(TRAIL);
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    const ol = assigned.find((el) => el.tagName.toLowerCase() === 'ol') as HTMLElement;
    expect(ol).not.toBeUndefined();
    expect(ol.querySelector('[aria-current="page"]')?.getAttribute('aria-disabled')).toBe('true');
    expect(ol.querySelector('li[role="presentation"]')?.getAttribute('aria-hidden')).toBe('true');
  });
});
