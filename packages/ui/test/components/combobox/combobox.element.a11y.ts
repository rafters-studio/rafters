import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/combobox/combobox.element';

interface Scene {
  open?: boolean;
  value?: string;
  disabled?: boolean;
  disabledItem?: string;
}

const OPTIONS: ReadonlyArray<[string, string]> = [
  ['react', 'React'],
  ['vue', 'Vue'],
  ['angular', 'Angular'],
];

function option(value: string, label: string, disabled: boolean): string {
  const disabledAttrs = disabled ? ' data-disabled="" aria-disabled="true"' : '';
  return `<div role="option" data-part="item" id="cb-content-option-${value}" data-value="${value}"${disabledAttrs}><span aria-hidden="true"></span><span>${label}</span></div>`;
}

async function mount({
  open = false,
  value = '',
  disabled = false,
  disabledItem,
}: Scene): Promise<HTMLElement> {
  // The bind seeds its open axis from the content's data-state, so an open
  // scene is an attribute, not a gesture.
  const options = OPTIONS.map(([v, label]) => option(v, label, disabledItem === v)).join('');
  document.body.innerHTML = `
    <main>
      <rafters-combobox data-part="root" value="${value}"${disabled ? ' disabled' : ''}>
        <div data-part="field">
          <input data-part="input" id="cb-input" type="text" autocomplete="off" value="" aria-label="Framework" placeholder="Search framework"${
            disabled ? ' disabled' : ''
          } />
          <button type="button" data-part="trigger" tabindex="-1" aria-label="Open"></button>
        </div>
        <div data-part="content" id="cb-content"${open ? ' data-state="open"' : ' hidden'}>
          ${options}
          <div data-part="empty" hidden>No results.</div>
        </div>
      </rafters-combobox>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with a selection', { open: true, value: 'vue' }],
  ['closed with a selection', { value: 'react' }],
  ['disabled', { disabled: true }],
  ['open with a disabled option', { open: true, disabledItem: 'vue' }],
];

for (const [name, scene] of scenes) {
  test(`rafters-combobox ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
