import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/checkbox/checkbox.element';

interface Scene {
  state?: 'checked' | 'unchecked' | 'indeterminate';
  disabled?: boolean;
  required?: boolean;
  name?: string;
  labelledBy?: boolean;
}

async function mount({
  state = 'unchecked',
  disabled = false,
  required = false,
  name,
  labelledBy = false,
}: Scene): Promise<HTMLElement> {
  // The same light-DOM markup the Astro performance emits: a native button root
  // carrying the score's initial projection, plus a sibling hidden input when named.
  const label = labelledBy ? 'aria-labelledby="terms-label"' : 'aria-label="Accept terms"';
  const attrs = [
    'type="button"',
    'data-part="root"',
    'id="c-root"',
    'role="checkbox"',
    `data-state="${state}"`,
    `aria-checked="${state === 'indeterminate' ? 'mixed' : state === 'checked' ? 'true' : 'false'}"`,
    disabled ? 'disabled' : '',
    required ? 'aria-required="true"' : '',
    label,
  ].join(' ');
  const hidden = name
    ? `<input data-part="hidden-input" type="hidden" name="${name}" value="on" disabled>`
    : '';
  const visibleLabel = labelledBy ? '<span id="terms-label">Accept terms</span>' : '';
  document.body.innerHTML = `
    <main>
      ${visibleLabel}
      <rafters-checkbox>
        <button ${attrs}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14"></path></svg>
        </button>
        ${hidden}
      </rafters-checkbox>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['unchecked default', {}],
  ['checked', { state: 'checked' }],
  ['indeterminate', { state: 'indeterminate' }],
  ['required', { required: true }],
  ['hard disabled', { disabled: true }],
  ['named with a hidden input', { name: 'terms', state: 'checked' }],
  ['labelled by visible text', { labelledBy: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-checkbox ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
