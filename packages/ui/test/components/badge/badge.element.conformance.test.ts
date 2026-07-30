/**
 * Web Component performance of the Badge score. The SAME score as the React and
 * Astro conformance tests -- but Badge is a pure static, so there is no
 * controller to drive. The WC renders the chip markup with the shared classes
 * once, slots the label from the light tree, and re-renders when `variant` or
 * `size` changes. That is the whole performance.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { BADGE_VARIANTS, badge } from '../../../src/components/badge/badge.behavior';
import { RaftersBadge } from '../../../src/components/badge/badge.element';
import { assertContractFulfillment, partText } from '../../harness/conformance';

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

afterEach(() => {
  document.body.innerHTML = '';
});

describe('badge conformance [wc]', () => {
  it('registers the rafters-badge tag on import', () => {
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('renders a root span carrying the shared classes', () => {
    const root = rootPart(mount());
    expect(root).not.toBeNull();
    expect(root.tagName).toBe('SPAN');
    expect(root.className).toContain('inline-flex');
    expect(root.className).toContain('rounded-full');
  });

  it('keeps the label in the light tree behind a slot -- the accessible payload', () => {
    const root = rootPart(mount('', 'Beta'));
    expect(root.querySelector('slot')).not.toBeNull();
    expect(partText(root, 'root')).toBe('Beta');
  });

  it('fulfills the contract: root projects NO ARIA and no role (like React)', () => {
    const root = rootPart(mount('variant="info"', 'Info'));
    assertContractFulfillment(badge, root, {}, { variant: 'info', size: 'default' }, ['root']);
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
    expect(root.className).toContain('text-label-medium');
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

  it('is a leaf: exactly one declared part', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('every variant is axe-clean inside a landmark', async () => {
    for (const variant of BADGE_VARIANTS) {
      mount(`variant="${variant}"`, variant);
      const results = await axe(document.body);
      expect(results.violations).toEqual([]);
    }
  });
});
