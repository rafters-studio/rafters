import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input-group/input-group.element';

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${markup}</main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

/** Every scene names the contained control with an aria-label. */
const scenes: ReadonlyArray<[string, string]> = [
  [
    'both affixes',
    `<rafters-input-group data-part="root">
      <div data-part="addonStart">$</div>
      <input data-part="control" id="amount" aria-label="Amount" />
      <div data-part="addonEnd">USD</div>
    </rafters-input-group>`,
  ],
  [
    'no affixes',
    `<rafters-input-group data-part="root">
      <input data-part="control" id="amount" aria-label="Amount" />
    </rafters-input-group>`,
  ],
  [
    'invalid',
    `<rafters-input-group data-part="root" data-invalid>
      <input data-part="control" id="amount" aria-label="Amount" />
    </rafters-input-group>`,
  ],
  [
    'disabled group with an action button',
    `<rafters-input-group data-part="root" disabled>
      <input data-part="control" id="code" aria-label="Code" />
      <div data-part="addonEnd"><button type="button">Apply</button></div>
    </rafters-input-group>`,
  ],
  [
    'individually disabled control',
    `<rafters-input-group data-part="root">
      <input data-part="control" id="code" aria-label="Code" disabled />
    </rafters-input-group>`,
  ],
  [
    'size sm',
    `<rafters-input-group data-part="root" data-size="sm">
      <div data-part="addonStart">$</div>
      <input data-part="control" id="amount" aria-label="Amount" value="42" />
    </rafters-input-group>`,
  ],
  [
    'action button affix',
    `<rafters-input-group data-part="root">
      <input data-part="control" id="code" aria-label="Code" />
      <div data-part="addonEnd"><button type="button">Apply</button></div>
    </rafters-input-group>`,
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-input-group ${name}`, async ({ task }) => {
    const host = await mount(markup);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
