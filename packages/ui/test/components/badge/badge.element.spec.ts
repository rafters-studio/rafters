import { expect, it } from 'vitest';
import { badge, BADGE_SIZES, BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';
import { badgeClasses } from '../../../src/components/badge/badge.classes';
import { RaftersBadge } from '../../../src/components/badge/badge.element';

const mount = (attrs: string, children = 'New'): HTMLElement => {
  document.body.innerHTML = `<main><rafters-badge ${attrs}>${children}</rafters-badge></main>`;
  const el = document.querySelector('rafters-badge');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-badge did not mount');
  return el;
};
const part = (host: HTMLElement, name: string): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>(`[data-part="${name}"]`) ?? null;
const need = (el: HTMLElement | null): HTMLElement => {
  if (!el) throw new Error('missing part');
  return el;
};
const slotIn = (el: HTMLElement, selector: string): HTMLSlotElement => {
  const slot = el.querySelector(selector);
  if (!(slot instanceof HTMLSlotElement)) throw new Error(`missing ${selector}`);
  return slot;
};

it('renders the root part with the default classes, no role, and a default slot', () => {
  const plain = mount('');
  expect(plain).toBeInstanceOf(RaftersBadge);
  const root = need(part(plain, 'root'));
  expect(root.tagName).toBe('SPAN');
  expect(root.getAttribute('data-slot')).toBe('badge');
  expect(root.className).toBe(badgeClasses({}, {}).root);
  expect(root.getAttribute('role')).toBeNull();
  const slot = slotIn(root, 'slot:not([name])');
  expect(slot.assignedNodes().map((n) => n.textContent)).toEqual(['New']);
  expect(part(plain, 'startIcon')).toBeNull();
  expect(part(plain, 'endIcon')).toBeNull();
});

it('renders every variant and size', () => {
  for (const variant of BADGE_VARIANTS) {
    for (const size of BADGE_SIZES) {
      expect(part(mount(`variant="${variant}" size="${size}"`), 'root')?.className).toBe(
        badgeClasses({ variant, size }, {}).root,
      );
    }
  }
});

it('renders the default classes for unknown values', () => {
  expect(part(mount('variant="nope" size="huge"'), 'root')?.className).toBe(
    badgeClasses({}, {}).root,
  );
});

it('re-renders when variant changes', () => {
  const el = mount('variant="success"');
  el.setAttribute('variant', 'warning');
  expect(part(el, 'root')?.className).toBe(badgeClasses({ variant: 'warning' }, {}).root);
});

it('renders icon wrappers in order, aria-hidden, wrapping named slots', () => {
  const iconed = mount('', '<svg slot="start-icon"></svg>Live<svg slot="end-icon"></svg>');
  const aria = badge.aria({}, {}, { root: '', startIcon: '', endIcon: '' });
  const start = need(part(iconed, 'startIcon'));
  const end = need(part(iconed, 'endIcon'));
  expect(start.getAttribute('data-icon')).toBe('inline-start');
  expect(start.getAttribute('aria-hidden')).toBe(aria.startIcon?.['aria-hidden']);
  expect(start.className).toBe(badgeClasses({}, {}).startIcon);
  expect(slotIn(start, 'slot[name="start-icon"]').assignedElements()).toHaveLength(1);
  expect(end.getAttribute('data-icon')).toBe('inline-end');
  expect(end.getAttribute('aria-hidden')).toBe(aria.endIcon?.['aria-hidden']);
  expect(end.className).toBe(badgeClasses({}, {}).endIcon);
  expect(slotIn(end, 'slot[name="end-icon"]').assignedElements()).toHaveLength(1);
  const kids = Array.from(need(part(iconed, 'root')).children);
  expect(kids.map((k) => k.getAttribute('data-part') ?? k.tagName)).toEqual([
    'startIcon',
    'SLOT',
    'endIcon',
  ]);
});
