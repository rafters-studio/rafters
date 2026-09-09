import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/toggle-group/toggle-group.element';

interface Scene {
  type?: 'single' | 'multiple';
  orientation?: 'horizontal' | 'vertical';
  pressed?: string[];
  disabled?: boolean;
  disabledItems?: string[];
}

const ITEMS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

function itemMarkup(value: string, label: string, pressed: boolean, disabled: boolean): string {
  const state = pressed ? 'on' : 'off';
  return `<button type="button" data-part="item" data-value="${value}" data-roving-item data-state="${state}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}>${label}</button>`;
}

/** The light-DOM markup the element conformance test mounts, inside a landmark. */
async function mount({
  type = 'single',
  orientation = 'horizontal',
  pressed = [],
  disabled = false,
  disabledItems = [],
}: Scene): Promise<HTMLElement> {
  const items = ITEMS.map(([value, label]) =>
    itemMarkup(value, label, pressed.includes(value), disabled || disabledItems.includes(value)),
  ).join('');
  document.body.innerHTML = `
    <main>
      <rafters-toggle-group>
        <div data-part="root" role="group" aria-label="Text formatting" data-type="${type}" data-orientation="${orientation}"${disabled ? ' data-disabled="true"' : ''}>
          ${items}
        </div>
      </rafters-toggle-group>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['single nothing selected', {}],
  ['single one selected', { pressed: ['b'] }],
  ['multiple two selected', { type: 'multiple', pressed: ['a', 'c'] }],
  ['vertical orientation', { orientation: 'vertical', pressed: ['a'] }],
  ['one item disabled', { disabledItems: ['b'] }],
  ['whole group disabled', { disabled: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-toggle-group ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
