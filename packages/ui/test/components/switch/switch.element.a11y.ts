import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/switch/switch.element';

interface Scene {
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

/**
 * The light-DOM markup the element conformance adapter builds: a real
 * <button role="switch" data-part="root"> carrying the score's initial
 * projection, with a decorative thumb. The accessible name is aria-label on
 * the inner button, exactly as the conformance suite supplies it.
 */
async function mount({ checked = false, disabled = false, required = false }: Scene) {
  const state = checked ? 'checked' : 'unchecked';
  document.body.innerHTML = `
    <main>
      <rafters-switch>
        <button type="button" role="switch" data-part="root" id="wc-root"
                aria-label="Enable notifications" aria-checked="${checked}"
                data-state="${state}"${required ? ' aria-required="true"' : ''}${disabled ? ' disabled' : ''}>
          <span data-part="thumb" id="wc-thumb" aria-hidden="true" data-state="${state}"></span>
        </button>
      </rafters-switch>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['unchecked default', {}],
  ['checked', { checked: true }],
  ['required unchecked', { required: true }],
  ['disabled', { disabled: true }],
  ['disabled checked', { disabled: true, checked: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-switch ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
