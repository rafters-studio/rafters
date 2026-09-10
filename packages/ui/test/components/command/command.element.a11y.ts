import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/command/command.element';

interface Scene {
  label?: string;
  disabledItem?: string;
  shortcut?: boolean;
}

const ITEMS: ReadonlyArray<[string, string]> = [
  ['calendar', 'Calendar'],
  ['search', 'Search'],
  ['settings', 'Settings'],
];

function option(value: string, label: string, disabled: boolean, shortcut: boolean): string {
  const disabledAttrs = disabled ? ' data-disabled="" aria-disabled="true"' : '';
  const kbd = shortcut ? '<kbd data-part="shortcut">Cmd+S</kbd>' : '';
  return `<div role="option" data-part="item" data-value="${value}" id="c-item-${value}"${disabledAttrs}><span>${label}</span>${kbd}</div>`;
}

async function mount({
  label = 'Actions',
  disabledItem,
  shortcut = false,
}: Scene): Promise<HTMLElement> {
  const items = ITEMS.map(([value, text], index) =>
    option(value, text, disabledItem === value, shortcut && index === ITEMS.length - 1),
  ).join('');
  document.body.innerHTML = `
    <main>
      <rafters-command data-part="root" id="c-root" data-label="${label}">
        <div data-part="input-wrapper">
          <input data-part="input" id="c-input" type="text" value="" aria-label="Command" placeholder="Type a command..." />
        </div>
        <div data-part="list" id="c-list">
          <div data-part="empty" id="c-empty" role="presentation" hidden>No results found.</div>
          ${items}
        </div>
      </rafters-command>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['all options visible', {}],
  ['custom listbox label', { label: 'Commands' }],
  ['with a disabled option', { disabledItem: 'search' }],
  ['with a keyboard shortcut', { shortcut: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-command ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
