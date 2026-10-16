/**
 * Web Component performance of the Card score. The SAME score as the React
 * spec -- but Card is a pure static, so there is no controller to
 * drive. The WC renders the surface markup with the shared classes and named
 * slots, once, and that is the whole performance. These assertions prove the
 * one contract (root renders, empty projection, slots pass through) holds in
 * the shadow-DOM performance too. Axe cleanliness for this markup is asserted
 * in the .a11y tier, not here.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCard } from '../../../src/components/card/card.element';
import {
  cardActionClasses,
  cardClasses,
  cardContentClasses,
  cardDescriptionClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardTitleClasses,
} from '../../../src/components/card/card.classes';
import { card } from '../../../src/components/card/card.behavior';

beforeAll(() => {
  if (!customElements.get('rafters-card')) {
    customElements.define('rafters-card', RaftersCard);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-card ${attrs}>${slots}</rafters-card>`;
  return document.body.querySelector('rafters-card') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('card [wc]', () => {
  it('renders a root surface part carrying the shared card classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toBe(cardClasses({}, {}).root);
  });

  it('root carries the data-slot swap contract alongside its data-part', () => {
    const host = mount();
    expect(shadowRoot(host).getAttribute('data-slot')).toBe('card');
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root, 'declared part "root" must be rendered').not.toBeNull();
    expect(card.aria({}, {}, { root: root.id }).root).toEqual({});
    expect(root.getAttribute('role')).toBeNull();
  });

  it('only root is a declared part -- sub-wrappers carry classes, no data-part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('exposes the full named-slot surface plus a default slot', () => {
    const host = mount();
    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'header',
        'title',
        'description',
        'content',
        'footer',
        'action',
        null,
      ]),
    );
  });

  it('nests title/description/action inside the header region (React parity)', () => {
    const host = mount();
    const header = host.shadowRoot?.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header).not.toBeNull();
    for (const name of ['title', 'description', 'action']) {
      expect(header.querySelector(`slot[name="${name}"]`), name).not.toBeNull();
    }
    // content and footer are root-level siblings, not header-nested
    expect(header.querySelector('slot[name="content"]')).toBeNull();
    expect(header.querySelector('slot[name="footer"]')).toBeNull();
  });

  it('slotted light-DOM content passes through', () => {
    const host = mount('', '<h3 slot="title">Report</h3><div slot="content">Body</div>');
    const titleSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]');
    const assigned = titleSlot?.assignedNodes({ flatten: true }) ?? [];
    expect(assigned.map((n) => n.textContent)).toEqual(['Report']);
  });

  it('fill attribute mirrors the React prop through the same projection', () => {
    const host = mount('fill="primary"');
    const root = shadowRoot(host);
    expect(root.className).toBe(cardClasses({ fill: 'primary' }, {}).root);
  });

  it('re-renders the surface when fill changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).className).toBe(cardClasses({}, {}).root);
    host.setAttribute('fill', 'primary');
    expect(shadowRoot(host).className).toBe(cardClasses({ fill: 'primary' }, {}).root);
    expect(shadowRoot(host).getAttribute('data-fill')).toBe('primary');
  });

  it('fill sets data-fill and the exact cardClasses root string', () => {
    const root = shadowRoot(mount('fill="primary"'));
    expect(root.className).toBe(cardClasses({ fill: 'primary' }, {}).root);
    expect(root.getAttribute('data-fill')).toBe('primary');
  });

  it('empty fill keeps the default surface and sets no data-fill', () => {
    const empty = shadowRoot(mount('fill=""'));
    expect(empty.className).toBe(cardClasses({}, {}).root);
    expect(empty.hasAttribute('data-fill')).toBe(false);
  });

  it('a host class never reaches the root part', () => {
    const root = shadowRoot(mount('class="mt-8"'));
    expect(root.className).toBe(cardClasses({}, {}).root);
  });

  it('regions carry their classes and the title is assigned to the title slot', () => {
    const host = mount('', '<h3 slot="title">Plan</h3>');
    const header = host.shadowRoot?.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header.className).toBe(cardHeaderClasses);
    const titleRegion = header.querySelector('[data-slot="card-title"]') as HTMLElement;
    expect(titleRegion.className).toBe(cardTitleClasses);
    const titleSlot = titleRegion.querySelector('slot[name="title"]') as HTMLSlotElement;
    expect(titleSlot.assignedElements()[0]?.textContent).toBe('Plan');
  });

  it('functional composition: fill, slots and parts as the issue states', () => {
    document.body.innerHTML =
      '<rafters-card fill="primary"><h3 slot="title">Plan</h3><p slot="content">Body</p></rafters-card>';
    const host = document.querySelector('rafters-card') as RaftersCard;
    const root = host.shadowRoot?.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toBe(cardClasses({ fill: 'primary' }, {}).root);
    expect(root.getAttribute('data-slot')).toBe('card');
    expect(root.getAttribute('data-fill')).toBe('primary');
    expect(root.getAttribute('role')).toBeNull();
    expect(card.aria({}, {}, { root: '' }).root).toEqual({});
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);

    const names = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'header',
        'title',
        'description',
        'action',
        'content',
        'footer',
        null,
      ]),
    );

    const header = host.shadowRoot?.querySelector('[data-slot="card-header"]') as HTMLElement;
    expect(header.className).toBe(cardHeaderClasses);
    const titleRegion = header.querySelector('[data-slot="card-title"]') as HTMLElement;
    expect(titleRegion.className).toBe(cardTitleClasses);
    const titleSlot = titleRegion.querySelector('slot[name="title"]') as HTMLSlotElement;
    expect(titleSlot.assignedElements()[0]?.textContent).toBe('Plan');
  });

  it('every region carries its exact shared class string', () => {
    const host = mount();
    const expected: Record<string, string> = {
      'card-description': cardDescriptionClasses,
      'card-action': cardActionClasses,
      'card-content': cardContentClasses,
      'card-footer': cardFooterClasses,
    };
    for (const [slot, classes] of Object.entries(expected)) {
      const region = host.shadowRoot?.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      expect(region.className, slot).toBe(classes);
    }
  });
});
