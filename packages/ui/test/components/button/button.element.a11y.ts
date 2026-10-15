import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/button/button.element';
import {
  BUTTON_ICON_SIZES,
  BUTTON_TEXT_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from '../../../src/components/button/button.behavior';

interface Scene {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  softDisabled?: boolean;
  loading?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

/** Mount `<rafters-button ...>` exactly as an author writes it; the element renders its parts. */
async function mount(scene: Scene, label: string): Promise<HTMLElement> {
  const attrs = [
    scene.variant ? `variant="${scene.variant}"` : '',
    scene.size ? `size="${scene.size}"` : '',
    scene.disabled ? 'disabled' : '',
    scene.softDisabled ? 'soft-disabled' : '',
    scene.loading ? 'loading' : '',
    scene.toggle ? 'toggle' : '',
    scene.pressed ? 'pressed' : '',
    scene.ariaLabel ? `aria-label="${scene.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const content = scene.ariaLabel
    ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor"></path></svg>'
    : label;
  document.body.innerHTML = `<main><rafters-button ${attrs}>${content}</rafters-button></main>`;
  await Promise.resolve(); // the element builds its parts one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

for (const variant of BUTTON_VARIANTS) {
  test(`rafters-button variant=${variant}`, async ({ task }) => {
    const host = await mount({ variant }, 'Save changes');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BUTTON_TEXT_SIZES) {
  test(`rafters-button size=${size}`, async ({ task }) => {
    const host = await mount({ size }, 'Save changes');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BUTTON_ICON_SIZES) {
  test(`rafters-button size=${size} icon-only with an accessible name`, async ({ task }) => {
    const host = await mount({ size, ariaLabel: 'Close' }, '');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const states: ReadonlyArray<[string, Scene]> = [
  ['loading', { loading: true }],
  ['toggle unpressed', { toggle: true }],
  ['toggle pressed', { toggle: true, pressed: true }],
  ['soft-disabled', { softDisabled: true }],
  ['hard disabled', { disabled: true }],
];

for (const [name, scene] of states) {
  test(`rafters-button ${name}`, async ({ task }) => {
    const host = await mount(scene, 'Save changes');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('rafters-button with start and end icon slots, svg title does not leak into the name', async ({
  task,
}) => {
  document.body.innerHTML = `
    <main>
      <rafters-button><svg slot="start-icon" viewBox="0 0 24 24"><title>Mail</title></svg>Save changes<svg slot="end-icon" viewBox="0 0 24 24"><title>Arrow</title></svg></rafters-button>
    </main>`;
  await Promise.resolve();
  await Promise.resolve();
  const host = document.body.querySelector('main') as HTMLElement;
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(host.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
