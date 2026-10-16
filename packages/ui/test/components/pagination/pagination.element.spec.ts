import { expect, it } from 'vitest';
import '../../../src/components/pagination/pagination.element';
import { pagination } from '../../../src/components/pagination/pagination.behavior';
import {
  paginationContentClasses,
  paginationNavClasses,
} from '../../../src/components/pagination/pagination.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-pagination');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-pagination did not mount');
  return el;
}

it('renders the nav landmark with one default slot in a shadow root', () => {
  const el = mount('<rafters-pagination></rafters-pagination>');
  expect(el.shadowRoot).not.toBeNull();
  expect(el.shadowRoot?.children.length).toBe(1);
  const nav = el.shadowRoot?.querySelector('nav');
  expect(nav?.getAttribute('data-part')).toBe('root');
  expect(nav?.getAttribute('aria-label')).toBe('Pagination');
  expect(nav?.className).toBe(paginationNavClasses);
  expect(nav?.querySelectorAll('slot')).toHaveLength(1);
  expect(nav?.querySelector('slot')?.hasAttribute('name')).toBe(false);
  expect(getComputedStyle(el).display).toBe('contents');
});

it('carries no attribute beyond data-part, aria-label and class', () => {
  const el = mount('<rafters-pagination></rafters-pagination>');
  const nav = el.shadowRoot?.querySelector('nav');
  expect(pagination.aria({}, {}, { root: '' }).root).toEqual({});
  expect(nav?.getAttributeNames().sort()).toEqual(['aria-label', 'class', 'data-part']);
});

it('slots the consumer-composed controls into the nav', () => {
  const el = mount(
    `<rafters-pagination><ul class="${paginationContentClasses}">` +
      '<li><a href="/p/1">1</a></li><li><a href="/p/2" aria-current="page">2</a></li>' +
      '</ul></rafters-pagination>',
  );
  const slot = el.shadowRoot?.querySelector('nav slot');
  if (!(slot instanceof HTMLSlotElement)) throw new Error('no slot');
  expect(slot.assignedElements()[0]?.tagName).toBe('UL');
});
