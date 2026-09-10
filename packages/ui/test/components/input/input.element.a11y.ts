import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input/input.element';

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${markup}</main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

/** Every scene names the control: an aria-label, or a visible label by id. */
const scenes: ReadonlyArray<[string, string]> = [
  [
    'valid and empty',
    `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" /></rafters-input>`,
  ],
  [
    'invalid with an error message',
    `<rafters-input>
      <input data-part="input" id="i" aria-label="Name" aria-invalid="true" value="" />
      <div data-part="error" id="i-error">Required</div>
    </rafters-input>`,
  ],
  [
    'required',
    `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" required /></rafters-input>`,
  ],
  [
    'disabled',
    `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" disabled /></rafters-input>`,
  ],
  [
    'read-only',
    `<rafters-input><input data-part="input" id="i" aria-label="Name" value="seed" readonly /></rafters-input>`,
  ],
  [
    'visible label',
    `<label for="i">Name</label>
    <rafters-input><input data-part="input" id="i" value="" /></rafters-input>`,
  ],
  [
    'email with placeholder',
    `<rafters-input><input data-part="input" id="i" type="email" name="email" aria-label="Email" placeholder="you@x.com" value="" /></rafters-input>`,
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-input ${name}`, async ({ task }) => {
    const host = await mount(markup);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
