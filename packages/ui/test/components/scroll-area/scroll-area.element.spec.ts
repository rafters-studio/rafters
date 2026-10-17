import { expect, it } from 'vitest';
import '../../../src/components/scroll-area/scroll-area.element';
import {
  scrollArea,
  type ScrollAreaConfig,
} from '../../../src/components/scroll-area/scroll-area.behavior';
import { scrollAreaClasses } from '../../../src/components/scroll-area/scroll-area.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-scroll-area');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-scroll-area did not mount');
  return el;
}

function expectPerforms(el: HTMLElement, config: ScrollAreaConfig): void {
  expect(el.shadowRoot?.children.length).toBe(1);
  const root = el.shadowRoot?.querySelector('div[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  expect(root.className).toBe(scrollAreaClasses(config, {}).root);
  expect(scrollArea.aria({}, config, { root: '' }).root).toEqual({});
  expect(root.getAttributeNames().filter((n) => n === 'role' || n.startsWith('aria-'))).toEqual([]);
  expect(root.children.length).toBe(1);
  const slot = root.firstElementChild;
  if (!(slot instanceof HTMLSlotElement)) throw new Error('no slot');
  expect(slot.assignedElements()).toEqual(Array.from(el.children));
}

it('performs the root with a slot for the content', () => {
  const el = mount('<rafters-scroll-area><p>A</p><p>B</p></rafters-scroll-area>');
  expect(el.children.length).toBe(2);
  expectPerforms(el, { orientation: 'vertical' });
});

it('performs orientation', () => {
  expectPerforms(mount('<rafters-scroll-area orientation="both"><p>A</p></rafters-scroll-area>'), {
    orientation: 'both',
  });
});

it('renders an unknown orientation as vertical', () => {
  expectPerforms(
    mount('<rafters-scroll-area orientation="diagonal"><p>A</p></rafters-scroll-area>'),
    { orientation: 'vertical' },
  );
});

it('re-renders on attribute change and keeps the content slotted', () => {
  const el = mount('<rafters-scroll-area><p>A</p></rafters-scroll-area>');
  el.setAttribute('orientation', 'horizontal');
  expectPerforms(el, { orientation: 'horizontal' });
});
