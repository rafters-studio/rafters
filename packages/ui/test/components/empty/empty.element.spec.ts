/**
 * Spec for Empty, Web Component target. Runs in the browser project (real
 * chromium). Empty is a pure static: the element renders the placeholder
 * column, its four fixed named-slot regions and a default slot, and nothing
 * else.
 */
import { afterEach, expect, test } from 'vitest';
import {
  emptyActionClasses,
  emptyClasses,
  emptyDescriptionClasses,
  emptyIconClasses,
  emptyTitleClasses,
} from '../../../src/components/empty/empty.classes';
import { RaftersEmpty } from '../../../src/components/empty/empty.element';

function mount(slots = ''): RaftersEmpty {
  document.body.innerHTML = `<rafters-empty>${slots}</rafters-empty>`;
  return document.querySelector('rafters-empty') as RaftersEmpty;
}

function rootOf(host: RaftersEmpty): HTMLElement {
  return host.shadowRoot?.querySelector('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('the root carries the shared classes, no ARIA, and is the only part', () => {
  const host = mount(
    '<h3 slot="title">No results</h3><button slot="action" type="button">Clear</button>',
  );
  const root = rootOf(host);
  expect(root.className).toBe(emptyClasses({}, {}).root);
  expect(root.getAttribute('role')).toBeNull();
  expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
});

test('the root holds the four regions then a default slot, each with its class', () => {
  const root = rootOf(mount());
  const children = Array.from(root.children) as HTMLElement[];
  expect(children.map((c) => c.getAttribute('data-slot') ?? c.tagName.toLowerCase())).toEqual([
    'empty-icon',
    'empty-title',
    'empty-description',
    'empty-action',
    'slot',
  ]);
  expect(children[0]?.className).toBe(emptyIconClasses);
  expect(children[1]?.className).toBe(emptyTitleClasses);
  expect(children[2]?.className).toBe(emptyDescriptionClasses);
  expect(emptyActionClasses).toBe('');
  expect(children[3]?.hasAttribute('class')).toBe(false);
  expect(children[4]?.getAttribute('name')).toBeNull();
});

test('slotted children are assigned to their named slots and the default slot', () => {
  const host = mount(
    '<h3 slot="title">No results</h3><button slot="action" type="button">Clear</button><p>Loose</p>',
  );
  const root = rootOf(host);
  const title = root.querySelector('slot[name="title"]') as HTMLSlotElement;
  expect(title.assignedElements()[0]?.textContent).toBe('No results');
  const action = root.querySelector('slot[name="action"]') as HTMLSlotElement;
  expect(action.assignedElements()[0]?.tagName.toLowerCase()).toBe('button');
  const fallback = root.querySelector('slot:not([name])') as HTMLSlotElement;
  expect(fallback.assignedElements()[0]?.textContent).toBe('Loose');
});

test('an empty element still renders all four regions', () => {
  const root = rootOf(mount());
  expect(root.querySelectorAll('[data-slot^="empty-"]')).toHaveLength(4);
});

test('observedAttributes is empty', () => {
  expect(Array.from(RaftersEmpty.observedAttributes)).toEqual([]);
});
