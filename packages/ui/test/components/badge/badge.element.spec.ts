/**
 * Web Component performance of the Badge score. The SAME score as the React and
 * Astro specs -- but Badge is a pure static, so there is no
 * controller to drive. The WC renders the chip markup with the shared classes
 * once, slots the label from the light tree, and re-renders when `variant` or
 * `size` changes. That is the whole performance.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installIconLayout, ICON_SVG_16, rectsOf } from './icon-layout';
import { badge } from '../../../src/components/badge/badge.behavior';
import { RaftersBadge } from '../../../src/components/badge/badge.element';

beforeAll(() => {
  if (!customElements.get('rafters-badge')) {
    customElements.define('rafters-badge', RaftersBadge);
  }
});

function mount(attrs = '', label = 'New'): HTMLElement {
  document.body.innerHTML = `<main><rafters-badge ${attrs}>${label}</rafters-badge></main>`;
  return document.body.querySelector('rafters-badge') as HTMLElement;
}

function rootPart(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

function partText(root: HTMLElement, part: string): string {
  const element =
    root.getAttribute('data-part') === part
      ? root
      : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!element) return '';
  const slot = element.querySelector('slot');
  if (slot) {
    return slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join('');
  }
  return element.textContent ?? '';
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('badge [wc]', () => {
  it('registers the rafters-badge tag on import', () => {
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('renders a root span carrying the shared classes', () => {
    const root = rootPart(mount());
    expect(root).not.toBeNull();
    expect(root.tagName).toBe('SPAN');
    expect(root.className).toContain('inline-grid');
    expect(root.className).toContain('rounded-full');
  });

  it('keeps the label in the light tree behind a slot -- the accessible payload', () => {
    const root = rootPart(mount('', 'Beta'));
    expect(root.querySelector('slot')).not.toBeNull();
    expect(partText(root, 'root')).toBe('Beta');
  });

  it('fulfills the contract: root projects NO ARIA and no role (like React)', () => {
    const root = rootPart(mount('variant="info"', 'Info'));
    const projection = badge.aria({}, { variant: 'info', size: 'default' }, { root: root.id });
    expect(projection.root).toEqual({});
    expect(root.getAttribute('role')).toBeNull();
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    expect(rootPart(mount()).getAttribute('data-slot')).toBe('badge');
  });

  it('defaults to the primary variant and default size (like React)', () => {
    const root = rootPart(mount());
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('px-2.5');
  });

  it('accepts the full variant vocabulary, including link', () => {
    const root = rootPart(mount('variant="link"', 'Link'));
    expect(root.className).toContain('underline-offset-4');
  });

  it('size selects the label-text scale', () => {
    const root = rootPart(mount('size="lg"', 'Large'));
    expect(root.className).toContain('ts-label-medium');
  });

  it('an unrecognised attribute value falls back through the shared class projection', () => {
    const root = rootPart(mount('variant="nonsense" size="enormous"'));
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('px-2.5');
  });

  it('re-renders when the variant attribute changes after connect', () => {
    const host = mount();
    expect(rootPart(host).className).toContain('bg-primary');
    host.setAttribute('variant', 'destructive');
    expect(rootPart(host).className).toContain('bg-destructive');
  });

  it('is a leaf: exactly one declared part when no icon is given', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
  });
});

describe('badge icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  function mountIcons(children = ''): HTMLElement {
    document.body.innerHTML = `<rafters-badge><span data-label>New</span>${children}</rafters-badge>`;
    return document.body.querySelector('rafters-badge') as HTMLElement;
  }

  it('slot="start-icon" and slot="end-icon" children render in hidden wrappers beside the label', () => {
    const host = mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span><span slot="end-icon">${ICON_SVG_16}</span>`,
    );
    const shadow = host.shadowRoot as ShadowRoot;
    const start = shadow.querySelector('[data-part="startIcon"]');
    const end = shadow.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const r = rectsOf(host);
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.label.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.label.right - 0.5);
    expect(r.start?.width).toBe(16);
  });

  it('start only and end only render just that wrapper', () => {
    const startOnly = mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>`);
    expect(startOnly.shadowRoot?.querySelector('[data-part="startIcon"]')).not.toBeNull();
    expect(startOnly.shadowRoot?.querySelector('[data-part="endIcon"]')).toBeNull();
    const endOnly = mountIcons(`<span slot="end-icon">${ICON_SVG_16}</span>`);
    expect(endOnly.shadowRoot?.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(endOnly.shadowRoot?.querySelector('[data-part="endIcon"]')).not.toBeNull();
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const host = mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>`);
    const r = rectsOf(host);
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('no wrapper without an icon child, and one appears when a child is added', async () => {
    const host = mountIcons();
    expect(host.shadowRoot?.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(host.shadowRoot?.querySelector('[data-part="endIcon"]')).toBeNull();
    host.insertAdjacentHTML('beforeend', `<span slot="start-icon">${ICON_SVG_16}</span>`);
    await Promise.resolve();
    expect(host.shadowRoot?.querySelector('[data-part="startIcon"]')).not.toBeNull();
  });
});
