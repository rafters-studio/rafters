import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/toggle/toggle.element';

interface Scene {
  pressed?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * The light-DOM markup the element spec builds: a real
 * <button data-part="root"> carrying the score's initial projection and a
 * label span. The accessible name is the label text, or aria-label on the
 * inner button for the icon-only pattern, as the spec gives it.
 */
async function mount({ pressed = false, disabled = false, ariaLabel }: Scene) {
  const label = ariaLabel === undefined ? 'Bold' : '<span aria-hidden="true">B</span>';
  document.body.innerHTML = `
    <main>
      <rafters-toggle>
        <button type="button" data-part="root" id="wc-root" aria-pressed="${pressed}"
                data-state="${pressed ? 'on' : 'off'}"${ariaLabel === undefined ? '' : ` aria-label="${ariaLabel}"`}${disabled ? ' disabled' : ''}>
          <span data-part="label" id="wc-label">${label}</span>
        </button>
      </rafters-toggle>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['off default', {}],
  ['on (pressed)', { pressed: true }],
  ['hard disabled', { disabled: true }],
  ['disabled on', { disabled: true, pressed: true }],
  ['icon-only with accessible name', { ariaLabel: 'Bold' }],
];

for (const [name, scene] of scenes) {
  test(`rafters-toggle ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('rafters-toggle with start and end icon slots, svg title does not leak into the name', async ({
  task,
}) => {
  document.body.innerHTML = `
    <main>
      <rafters-toggle>
        <button type="button" data-part="root" id="wc-root" aria-pressed="false" data-state="off"><span data-part="label" id="wc-label">Bold</span></button>
        <svg slot="start-icon" viewBox="0 0 24 24"><title>Mail</title></svg>
        <svg slot="end-icon" viewBox="0 0 24 24"><title>Arrow</title></svg>
      </rafters-toggle>
    </main>`;
  await Promise.resolve();
  await Promise.resolve();
  const host = document.body.querySelector('main') as HTMLElement;
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(host.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
