import { expect, it } from 'vitest';
import { badge, BADGE_SIZES, BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';
import { badgeClasses } from '../../../src/components/badge/badge.classes';
import { RaftersBadge } from '../../../src/components/badge/badge.element';

const mount = (attrs: string, children = 'New'): HTMLElement => {
  document.body.innerHTML = `<main><rafters-badge ${attrs}>${children}</rafters-badge></main>`;
  return document.querySelector('rafters-badge') as HTMLElement;
};
const part = (host: HTMLElement, name: string) =>
  host.shadowRoot?.querySelector(`[data-part="${name}"]`) as HTMLElement | null;

it('renders the root with default classes, no role, and the label slotted', () => {
  const plain = mount('');
  expect(plain).toBeInstanceOf(RaftersBadge);
  const root = part(plain, 'root') as HTMLElement;
  expect(root.tagName).toBe('SPAN');
  expect(root.getAttribute('data-slot')).toBe('badge');
  expect(root.className).toBe(badgeClasses({}, {}).root);
  expect(root.getAttribute('role')).toBeNull();
  const slot = root.querySelector('slot:not([name])') as HTMLSlotElement;
  expect(slot.assignedNodes().map((n) => n.textContent)).toEqual(['New']);
  expect(part(plain, 'startIcon')).toBeNull();
  expect(part(plain, 'endIcon')).toBeNull();
});

it('renders every variant and size, and the default for unknown values', () => {
  for (const variant of BADGE_VARIANTS) {
    for (const size of BADGE_SIZES) {
      expect(part(mount(`variant="${variant}" size="${size}"`), 'root')?.className).toBe(
        badgeClasses({ variant, size }, {}).root,
      );
    }
  }
  expect(part(mount('variant="nope" size="huge"'), 'root')?.className).toBe(
    badgeClasses({}, {}).root,
  );
});

it('renders icon wrappers in order, aria-hidden, wrapping named slots', () => {
  const iconed = mount('', '<svg slot="start-icon"></svg>Live<svg slot="end-icon"></svg>');
  const aria = badge.aria({}, {}, { root: '', startIcon: '', endIcon: '' });
  const start = part(iconed, 'startIcon') as HTMLElement;
  const end = part(iconed, 'endIcon') as HTMLElement;
  expect(start.getAttribute('data-icon')).toBe('inline-start');
  expect(start.getAttribute('aria-hidden')).toBe(aria.startIcon?.['aria-hidden']);
  expect(start.className).toBe(badgeClasses({}, {}).startIcon);
  expect(
    (start.querySelector('slot[name="start-icon"]') as HTMLSlotElement).assignedElements(),
  ).toHaveLength(1);
  expect(end.getAttribute('data-icon')).toBe('inline-end');
  expect(end.getAttribute('aria-hidden')).toBe(aria.endIcon?.['aria-hidden']);
  expect(end.className).toBe(badgeClasses({}, {}).endIcon);
  expect(
    (end.querySelector('slot[name="end-icon"]') as HTMLSlotElement).assignedElements(),
  ).toHaveLength(1);
  const kids = Array.from((part(iconed, 'root') as HTMLElement).children);
  expect(kids.map((k) => k.getAttribute('data-part') ?? k.tagName)).toEqual([
    'startIcon',
    'SLOT',
    'endIcon',
  ]);
});
