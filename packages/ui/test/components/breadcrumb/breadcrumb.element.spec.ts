/**
 * Web Component performance of the Breadcrumb score. The SAME score as the
 * React and Astro specs -- but Breadcrumb is a PURE STATIC, so there is
 * no controller to drive. Like Container, the root IS the semantic nav
 * landmark, so the element creates that tag inside its shadow root and the host
 * is display:contents -- the landmark, not the custom element, is the box. The
 * list/item/link/page/separator/ellipsis family is consumer-composed light DOM
 * projected through the default slot. These assertions prove the one contract
 * (the nav landmark renders with its fixed label, slotted content projects
 * through) holds in the shadow-DOM performance too. Axe cleanliness for this
 * markup is asserted in the .a11y tier, not here.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
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

describe('breadcrumb icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  async function mountIcons(link: string, current = ''): Promise<HTMLElement> {
    const host = mount(
      `<ol><li><a href="/">${link}</a></li><li><span role="link" aria-disabled="true" aria-current="page">${current}</span></li></ol>`,
    );
    await Promise.resolve(); // let the element's deferred wrap run
    return host;
  }

  const linkOf = (host: HTMLElement) => host.querySelector('a') as HTMLElement;
  const pageOf = (host: HTMLElement) => host.querySelector('[aria-current="page"]') as HTMLElement;
  const label = '<span data-label>Home</span>';

  it('slot="start-icon" and slot="end-icon" children render in hidden wrappers beside the label', async () => {
    const both = `<span slot="start-icon">${ICON_SVG_16}</span>${label}<span slot="end-icon">${ICON_SVG_16}</span>`;
    const host = await mountIcons(both, both);
    for (const el of [linkOf(host), pageOf(host)]) {
      const start = el.querySelector('[data-part="startIcon"]');
      const end = el.querySelector('[data-part="endIcon"]');
      expect(start?.getAttribute('aria-hidden')).toBe('true');
      expect(start?.getAttribute('data-icon')).toBe('inline-start');
      expect(end?.getAttribute('aria-hidden')).toBe('true');
      expect(end?.getAttribute('data-icon')).toBe('inline-end');
      const r = rectsOf(el);
      expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.label.left + 0.5);
      expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.label.right - 0.5);
    }
  });

  it('start only and end only render just that wrapper; none renders neither', async () => {
    const startOnly = await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>${label}`);
    expect(linkOf(startOnly).querySelector('[data-part="startIcon"]')).not.toBeNull();
    expect(linkOf(startOnly).querySelector('[data-part="endIcon"]')).toBeNull();
    const endOnly = await mountIcons(`${label}<span slot="end-icon">${ICON_SVG_16}</span>`);
    expect(linkOf(endOnly).querySelector('[data-part="startIcon"]')).toBeNull();
    expect(linkOf(endOnly).querySelector('[data-part="endIcon"]')).not.toBeNull();
    const none = await mountIcons(label);
    expect(none.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', async () => {
    document.documentElement.dir = 'rtl';
    const host = await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>${label}`);
    const r = rectsOf(linkOf(host));
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', async () => {
    const host = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span>${label}<span slot="end-icon">${ICON_SVG_20}</span>`,
    );
    const r = rectsOf(linkOf(host));
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });
});
