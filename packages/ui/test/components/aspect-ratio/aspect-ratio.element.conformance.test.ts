/**
 * Web Component performance of the AspectRatio score. The SAME score as the
 * React and Astro conformances -- but AspectRatio is a PURE STATIC, so there is
 * no controller to drive. The element renders one wrapper carrying the shared
 * base classes, the resolved ratio on the inline style channel, and a default
 * slot. These assertions prove the one contract (root renders, empty
 * projection, ratio parsed and painted, slotted content passes through) holds
 * in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { aspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio.behavior';
import { RaftersAspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio.element';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-aspect-ratio')) {
    customElements.define('rafters-aspect-ratio', RaftersAspectRatio);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-aspect-ratio ${attrs}>${slots}</rafters-aspect-ratio>`;
  return document.body.querySelector('rafters-aspect-ratio') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

/**
 * The painted proportion, normalised. A single-number `aspect-ratio` is the CSS
 * ratio `n / 1`, and the DOM serialises it that way; strip the `/ 1` so the
 * assertion reads the bare proportion the score resolved.
 */
function paintedRatio(host: HTMLElement): string {
  return shadowRoot(host)
    .style.getPropertyValue('aspect-ratio')
    .replace(/\s*\/\s*1$/, '');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('aspect-ratio conformance [wc]', () => {
  it('renders a single root wrapper carrying the shared base classes and a slot', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('relative w-full');
    expect(root.querySelector('slot')).not.toBeNull();
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(aspectRatio, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('defaults a missing ratio to 1 on the inline style channel', () => {
    const host = mount();
    expect(paintedRatio(host)).toBe('1');
  });

  it('parses a fraction string like "16/9" and paints it', () => {
    const host = mount('ratio="16/9"');
    expect(paintedRatio(host)).toBe(String(16 / 9));
  });

  it('falls back to 1 for non-numeric or non-positive ratios', () => {
    expect(paintedRatio(mount('ratio="foo"'))).toBe('1');
    expect(paintedRatio(mount('ratio="-1"'))).toBe('1');
    expect(paintedRatio(mount('ratio="0"'))).toBe('1');
  });

  it('re-renders the ratio when the attribute changes after connect', () => {
    const host = mount('ratio="1"');
    expect(paintedRatio(host)).toBe('1');
    host.setAttribute('ratio', '4/3');
    expect(paintedRatio(host)).toBe(String(4 / 3));
  });

  it('keeps the irreducible host and slotted-fill rules in the adopted styles', () => {
    const css = RaftersAspectRatio.styles;
    expect(css).toMatch(/:host\s*{[^}]*display:\s*block/);
    expect(css).toMatch(/::slotted\(\*\)/);
    // Like React and Astro, the box never forces object-fit on its content.
    expect(css).not.toContain('object-fit');
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<img src="/photo.jpg" alt="Photo" />');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.some((n) => (n as HTMLElement).tagName?.toLowerCase() === 'img')).toBe(true);
  });

  it('is axe-clean: the box is a layout utility, its content carries semantics', async () => {
    document.body.innerHTML =
      '<main><rafters-aspect-ratio ratio="16/9"><img src="/photo.jpg" alt="A descriptive alt" /></rafters-aspect-ratio></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
