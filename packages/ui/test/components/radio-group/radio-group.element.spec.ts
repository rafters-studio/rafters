import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  radioGroup,
  radioItemAria,
  type RadioGroupConfig,
  type RadioGroupState,
} from '../../../src/components/radio-group/radio-group.behavior';
import { radioGroupClasses } from '../../../src/components/radio-group/radio-group.classes';
import { RaftersRadioGroup } from '../../../src/components/radio-group/radio-group.element';

interface Scene {
  attrs: string;
  itemA: string;
  config: RadioGroupConfig;
  value: string | null;
}

const SCENES: ReadonlyArray<[string, Scene]> = [
  ['none selected', { attrs: '', itemA: '', config: { name: 'plan' }, value: null }],
  [
    'seeded',
    { attrs: 'value="b"', itemA: '', config: { name: 'plan', defaultValue: 'b' }, value: 'b' },
  ],
  [
    'horizontal',
    {
      attrs: 'orientation="horizontal"',
      itemA: '',
      config: { name: 'plan', orientation: 'horizontal' },
      value: null,
    },
  ],
  [
    'required',
    { attrs: 'required', itemA: '', config: { name: 'plan', required: true }, value: null },
  ],
  [
    'disabled group',
    { attrs: 'disabled', itemA: '', config: { name: 'plan', disabled: true }, value: null },
  ],
  ['disabled item', { attrs: '', itemA: 'disabled', config: { name: 'plan' }, value: null }],
];

function markup(attrs: string, itemA: string): string {
  return (
    '<main><form>' +
    `<rafters-radio-group name="plan" aria-label="Plan" ${attrs}>` +
    `<rafters-radio-item value="a" ${itemA}>A</rafters-radio-item>` +
    '<rafters-radio-item value="b">B</rafters-radio-item>' +
    '<rafters-radio-item value="c">C</rafters-radio-item>' +
    '</rafters-radio-group></form></main>'
  );
}

async function mount(attrs = '', itemA = ''): Promise<HTMLElement> {
  document.body.innerHTML = markup(attrs, itemA);
  await Promise.resolve();
  const root = document.querySelector<HTMLElement>('rafters-radio-group [data-part="root"]');
  if (!root) throw new Error('radio group did not render');
  return root;
}

const items = (root: HTMLElement): HTMLButtonElement[] =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('[data-part="item"]'));

const checked = (root: HTMLElement): string | undefined =>
  items(root).find((i) => i.getAttribute('aria-checked') === 'true')?.dataset['value'];

afterEach(() => {
  document.body.innerHTML = '';
});

it('upgrades to RaftersRadioGroup and renders the parts in light DOM', async () => {
  const root = await mount();
  const host = document.querySelector('rafters-radio-group');
  expect(host).toBeInstanceOf(RaftersRadioGroup);
  expect(host?.shadowRoot).toBeNull();
  expect(root.getAttribute('role')).toBe('radiogroup');
  expect(items(root)).toHaveLength(3);
  for (const item of items(root)) {
    expect(item.getAttribute('role')).toBe('radio');
    expect(item.type).toBe('button');
    expect(item.firstElementChild?.getAttribute('data-part')).toBe('indicator');
    expect(item.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  }
});

for (const [name, scene] of SCENES) {
  it(`projects classes and aria: ${name}`, async () => {
    const root = await mount(scene.attrs, scene.itemA);
    const state: RadioGroupState = { value: scene.value };
    const classes = radioGroupClasses(scene.config, state);
    expect(root.className).toBe(classes.root);
    const ariaRoot = radioGroup.aria(state, scene.config, { root: root.id, item: '' }).root ?? {};
    for (const [k, v] of Object.entries(ariaRoot)) {
      expect(root.getAttribute(k)).toBe(v === undefined ? null : String(v));
    }
    for (const item of items(root)) {
      expect(item.className).toBe(classes.item);
      expect(item.querySelector('[data-part="indicator"]')?.className).toBe(classes.indicator);
      const attrs = radioItemAria(item.dataset['value'] ?? '', state, scene.config);
      for (const [k, v] of Object.entries(attrs)) {
        expect(item.getAttribute(k)).toBe(v === undefined ? null : String(v));
      }
    }
  });
}

it('selects on click and keeps the checked item on a second click', async () => {
  const root = await mount();
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  expect(checked(root)).toBe('b');
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  expect(checked(root)).toBe('b');
});

it('selects the focused item on Space and Enter', async () => {
  const root = await mount();
  items(root)[0]?.focus();
  await userEvent.keyboard(' ');
  expect(checked(root)).toBe('a');
  items(root)[1]?.focus();
  await userEvent.keyboard('{Enter}');
  expect(checked(root)).toBe('b');
});

it('moves and selects with arrows, Home and End in a vertical group', async () => {
  const root = await mount();
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  await userEvent.keyboard('{ArrowDown}');
  expect(checked(root)).toBe('c');
  await userEvent.keyboard('{ArrowUp}');
  expect(checked(root)).toBe('b');
  await userEvent.keyboard('{Home}');
  expect(checked(root)).toBe('a');
  await userEvent.keyboard('{End}');
  expect(checked(root)).toBe('c');
});

it('skips a disabled item', async () => {
  const root = await mount('', 'disabled');
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  await userEvent.keyboard('{Home}');
  expect(checked(root)).toBe('b');
  expect(items(root)[0]?.disabled).toBe(true);
});

it('moves with Left and Right in a horizontal group', async () => {
  const root = await mount('orientation="horizontal"');
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  await userEvent.keyboard('{ArrowRight}');
  expect(checked(root)).toBe('c');
  await userEvent.keyboard('{ArrowLeft}');
  expect(checked(root)).toBe('b');
});

it('Tab enters the group at the first item and selects nothing', async () => {
  const root = await mount();
  await userEvent.tab();
  expect(document.activeElement).toBe(items(root)[0]);
  expect(checked(root)).toBeUndefined();
});

it('ignores click, Space, Enter and arrows in a disabled group', async () => {
  const root = await mount('disabled');
  const first = items(root)[0];
  first?.click();
  for (const key of [' ', 'Enter', 'ArrowDown']) {
    first?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }
  expect(checked(root)).toBeUndefined();
});

it('adds no form entry before or after a selection', async () => {
  await mount();
  const form = document.querySelector('form');
  if (!form) throw new Error('no form');
  expect(new FormData(form).getAll('plan')).toEqual([]);
  await userEvent.click(page.getByRole('radio', { name: 'B' }));
  expect(new FormData(form).getAll('plan')).toEqual([]);
});

it('re-adding the element leaves one set of parts and one step per arrow', async () => {
  const root = await mount();
  const host = document.querySelector('rafters-radio-group');
  if (!host) throw new Error('no host');
  const parent = host.parentElement;
  host.remove();
  parent?.appendChild(host);
  await Promise.resolve();
  expect(host.querySelectorAll('[data-part="root"]')).toHaveLength(1);
  expect(host.querySelectorAll('[data-part="item"]')).toHaveLength(3);
  await userEvent.click(page.getByRole('radio', { name: 'A' }));
  await userEvent.keyboard('{ArrowDown}');
  expect(checked(root)).toBe('b');
});
