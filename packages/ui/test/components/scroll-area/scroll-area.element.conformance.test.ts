/**
 * Web Component performance of the ScrollArea score. The SAME score as the
 * React conformance test -- but ScrollArea is a pure static, so there is no
 * controller to drive. The WC renders the scroll-surface markup with the
 * shared classes and a default slot, once, and that is the whole performance.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersScrollArea } from '../../../src/components/scroll-area/scroll-area.element';
import { scrollArea } from '../../../src/components/scroll-area/scroll-area.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-scroll-area')) {
    customElements.define('rafters-scroll-area', RaftersScrollArea);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-scroll-area ${attrs}>${slots}</rafters-scroll-area>`;
  return document.body.querySelector('rafters-scroll-area') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('scroll-area conformance [wc]', () => {
  it('renders a root scroll surface carrying the shared classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('h-full w-full');
    expect(root.className).toContain('[&::-webkit-scrollbar-thumb]:bg-border');
    expect(root.className).toContain('overflow-y-auto');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(scrollArea, root, {}, { orientation: 'vertical' }, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('orientation mirrors the React prop through the same projection', () => {
    const host = mount('orientation="horizontal"');
    const root = shadowRoot(host);
    expect(root.className).toContain('overflow-x-auto');
    expect(root.className).not.toContain('overflow-y-auto');
  });

  it('re-renders the surface when orientation changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('overflow-y-auto');
    host.setAttribute('orientation', 'both');
    expect(shadowRoot(host).className).toContain('overflow-auto');
  });

  it('exposes a default slot for content', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelector('slot')).not.toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<p>Body</p>');
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Body');
  });

  it('is axe-clean', async () => {
    document.body.innerHTML = '<main><rafters-scroll-area><p>Body</p></rafters-scroll-area></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
