/**
 * Web Component performance of the Pagination score. The SAME score as the
 * React and Astro conformances -- but Pagination is a PURE STATIC, so there is
 * no controller to drive. Like Container and Breadcrumb, the root IS the
 * semantic nav landmark, so the element creates that tag inside its shadow root
 * and the host is display:contents -- the landmark, not the custom element, is
 * the box. The content/item/link/previous/next/ellipsis family is
 * consumer-composed light DOM projected through the default slot. These
 * assertions prove the one contract (the nav landmark renders with its fixed
 * label, slotted content projects through with its earned semantics, the
 * surface is axe-clean) holds in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersPagination } from '../../../src/components/pagination/pagination.element';
import { pagination } from '../../../src/components/pagination/pagination.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

const TRAIL = `
  <ul class="flex flex-row items-center gap-1">
    <li><a href="/page/1" aria-label="Go to previous page" aria-disabled="true">Previous</a></li>
    <li><a href="/page/1" aria-current="page">1</a></li>
    <li><a href="/page/2">2</a></li>
    <li><span aria-hidden="true">...<span class="sr-only">More pages</span></span></li>
    <li><a href="/page/10">10</a></li>
    <li><a href="/page/2" aria-label="Go to next page">Next</a></li>
  </ul>
`;

beforeAll(() => {
  if (!customElements.get('rafters-pagination')) {
    customElements.define('rafters-pagination', RaftersPagination);
  }
});

function mount(slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-pagination>${slots}</rafters-pagination>`;
  return document.body.querySelector('rafters-pagination') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pagination conformance [wc]', () => {
  it('the root IS the nav landmark labelled "Pagination"', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Pagination');
  });

  it('fulfills the contract: root projects NO ARIA role (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(pagination, root, {}, {}, ['root']);
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
    expect(RaftersPagination.observedAttributes).toEqual([]);
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
    const ul = assigned.find((el) => el.tagName.toLowerCase() === 'ul') as HTMLElement;
    expect(ul).not.toBeUndefined();
    const current = ul.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.tagName.toLowerCase()).toBe('a');
    expect(current.hasAttribute('aria-disabled')).toBe(false);
    expect(
      ul.querySelector('[aria-label="Go to previous page"]')?.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(ul.querySelector('span[aria-hidden="true"] .sr-only')?.textContent).toBe('More pages');
  });

  it('is axe-clean -- the nav landmark wraps a valid list trail', async () => {
    mount(TRAIL);
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
