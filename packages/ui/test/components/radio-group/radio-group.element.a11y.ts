import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/radio-group/radio-group.element';

interface Scene {
  orientation?: 'horizontal' | 'vertical';
  checked?: string;
  disabled?: boolean;
  required?: boolean;
  disabledItems?: string[];
}

const OPTIONS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

function item(value: string, label: string, checked: boolean, disabled: boolean): string {
  const state = checked ? 'checked' : 'unchecked';
  return `<button type="button" role="radio" data-part="item" data-value="${value}" data-state="${state}" aria-checked="${checked}"${disabled ? ' disabled' : ''}><span data-part="indicator" aria-hidden="true"></span>${label}</button>`;
}

async function mount({
  orientation = 'vertical',
  checked,
  disabled = false,
  required = false,
  disabledItems = [],
}: Scene): Promise<HTMLElement> {
  const items = OPTIONS.map(([value, label]) =>
    item(value, label, value === checked, disabled || disabledItems.includes(value)),
  ).join('');
  // The root is consumer-authored light DOM, so it carries the group's
  // accessible name; a radiogroup has no text of its own.
  document.body.innerHTML = `
    <main>
      <rafters-radio-group>
        <div data-part="root" role="radiogroup" aria-label="Choose one" aria-orientation="${orientation}"${disabled ? ' aria-disabled="true"' : ''}${required ? ' aria-required="true"' : ''}>
          ${items}
        </div>
      </rafters-radio-group>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['nothing selected', {}],
  ['one selected', { checked: 'b' }],
  ['horizontal', { checked: 'a', orientation: 'horizontal' }],
  ['required', { required: true }],
  ['one item disabled', { checked: 'a', disabledItems: ['b'] }],
  ['whole group disabled', { checked: 'a', disabled: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-radio-group ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
