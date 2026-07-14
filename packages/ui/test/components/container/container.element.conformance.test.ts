/**
 * Web Component performance of the Container score. The SAME score as the
 * React and Astro conformances -- but Container is a PURE STATIC, so there is
 * no controller to drive. The one difference from card: Container's root IS
 * the semantic `as` element (a landmark), so the element creates that tag
 * inside its shadow root and the host is display:contents -- the landmark, not
 * the custom element, is the box. These assertions prove the one contract (the
 * `as` landmark renders with the shared container classes, consumer content
 * projects through the slot, the surface is axe-clean) holds in the shadow-DOM
 * performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersContainer } from '../../../src/components/container/container.element';

beforeAll(() => {
  if (!customElements.get('rafters-container')) {
    customElements.define('rafters-container', RaftersContainer);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-container ${attrs}>${slots}</rafters-container>`;
  return document.body.querySelector('rafters-container') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('container conformance [wc]', () => {
  it('the semantic element IS the contract: as drives the landmark root', () => {
    const host = mount('as="main" size="6xl"');
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('main');
  });

  it('the root carries the shared container classes (query provider + size)', () => {
    const host = mount('as="section" size="6xl"');
    const root = shadowRoot(host);
    expect(root.className).toContain('@container');
    expect(root.className).toContain('max-w-6xl');
  });

  it('columns puts the container on the grid -- one tag, container and grid', () => {
    const host = mount('as="section" columns="3"');
    const root = shadowRoot(host);
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-3');
  });

  it('queryName lands as the containerName style -- the one style channel', () => {
    const host = mount('query-name="rail"');
    const root = shadowRoot(host);
    expect(root.style.containerName).toBe('rail');
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('as="main"', '<p>Body</p>');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Body');
  });

  it('is axe-clean: as="main" is its own landmark', async () => {
    document.body.innerHTML = '<rafters-container as="main"><p>Body</p></rafters-container>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
