import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/select/select.element';

interface Scene {
  open?: boolean;
  value?: string;
  disabled?: boolean;
  disabledItem?: string;
}

const OPTIONS: ReadonlyArray<[string, string]> = [
  ['apple', 'Apple'],
  ['banana', 'Banana'],
  ['cherry', 'Cherry'],
];

function optionMarkup(value: string, label: string, disabled: boolean): string {
  const disabledAttrs = disabled ? ' aria-disabled="true" data-disabled=""' : ' tabindex="-1"';
  return `<div role="option" data-part="item" data-value="${value}" data-roving-item${disabledAttrs}><span></span><span>${label}</span></div>`;
}

async function mount({
  open = false,
  value = '',
  disabled = false,
  disabledItem,
}: Scene): Promise<HTMLElement> {
  const state = open ? 'open' : 'closed';
  const selected = OPTIONS.find(([optionValue]) => optionValue === value);
  const display = selected ? selected[1] : 'Pick a fruit';
  const options = OPTIONS.map(([optionValue, label]) =>
    optionMarkup(optionValue, label, disabledItem === optionValue),
  ).join('');
  // The trigger is a combobox, which takes its name from the author, never
  // from its contents -- so the light-DOM markup labels it, as the React
  // spec scene does.
  document.body.innerHTML = `
    <main>
      <rafters-select data-part="root" value="${value}"${disabled ? ' disabled' : ''}>
        <button type="button" data-part="trigger" id="s-trigger" aria-label="Fruit">
          <div data-part="value" data-placeholder="Pick a fruit">${display}</div>
        </button>
        <div data-part="content" id="s-content" data-state="${state}"${open ? '' : ' hidden'}>
          <div>${options}</div>
        </div>
      </rafters-select>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['closed with a selected value', { value: 'banana' }],
  ['open with a selected value', { value: 'banana', open: true }],
  ['open with one option disabled', { open: true, disabledItem: 'banana' }],
  ['disabled', { disabled: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-select ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('rafters-select with slotted icons, svg titles do not leak into the name', async ({
  task,
}) => {
  document.body.innerHTML = `
    <main>
      <rafters-select data-part="root" value="">
        <button type="button" data-part="trigger" id="s-trigger" aria-label="Fruit">
          <svg slot="start-icon" viewBox="0 0 24 24"><title>Fruit</title></svg>
          <div data-part="value" data-placeholder="Pick a fruit">Pick a fruit</div>
          <svg slot="end-icon" viewBox="0 0 24 24"><title>Arrow</title></svg>
        </button>
        <div data-part="content" id="s-content" data-state="open">
          <div>
            <div role="option" data-part="item" data-value="apple" data-roving-item tabindex="-1"><span></span><span>Apple</span><svg slot="start-icon" viewBox="0 0 24 24"><title>Apple icon</title></svg></div>
          </div>
        </div>
      </rafters-select>
    </main>`;
  await Promise.resolve();
  await Promise.resolve();
  const host = document.body.querySelector('main') as HTMLElement;
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(host.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(3);
});
