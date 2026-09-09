import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input-otp/input-otp.element';

interface Scene {
  value?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

const MAX_LENGTH = 6;

/** The authored light-DOM field: one real named input plus painted slots. */
function markup({ value = '', disabled = false, required = false, name }: Scene): string {
  const slots = Array.from(
    { length: MAX_LENGTH },
    (_, index) =>
      `<div data-part="slot" data-value="${index}">` +
      `<span data-otp-char></span>` +
      `<span data-otp-caret aria-hidden="true" hidden></span>` +
      `</div>`,
  ).join('');
  return `<rafters-input-otp>
    <div data-part="root" data-max-length="${MAX_LENGTH}">
      <input data-part="input" type="text" inputmode="numeric" autocomplete="one-time-code"
        aria-label="Enter ${MAX_LENGTH} character code" value="${value}"
        ${name ? `name="${name}"` : ''} ${disabled ? 'disabled' : ''} ${required ? 'required' : ''} />
      <div data-part="group">${slots}</div>
    </div>
  </rafters-input-otp>`;
}

async function mount(scene: Scene): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${markup(scene)}</main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['empty', {}],
  ['partially filled', { value: '123' }],
  ['complete', { value: '123456' }],
  ['disabled', { disabled: true, value: '12' }],
  ['required with a form name', { required: true, name: 'code' }],
];

for (const [name, scene] of scenes) {
  test(`rafters-input-otp ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
