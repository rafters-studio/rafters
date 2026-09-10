import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/button/button.element';
import {
  button,
  BUTTON_ICON_SIZES,
  BUTTON_TEXT_SIZES,
  BUTTON_VARIANTS,
  type ButtonConfig,
  type ButtonSize,
  type ButtonVariant,
} from '../../../src/components/button/button.behavior';
import { buttonClasses } from '../../../src/components/button/button.classes';

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

function attrsOf(attrs: Record<string, string | boolean | undefined>): string {
  return Object.entries(attrs)
    .filter((entry): entry is [string, string | boolean] => entry[1] !== undefined)
    .map(([name, value]) => ` ${name}="${String(value)}"`)
    .join('');
}

/**
 * The light-DOM markup Astro emits: a real inner button carrying the score's
 * initial projection, which the element hands to bindButton after one
 * microtask. Same shape the element conformance adapter builds.
 */
async function mount(scene: Scene, label: string): Promise<HTMLElement> {
  const config: ButtonConfig = {
    variant: scene.variant ?? 'default',
    size: scene.size ?? 'default',
    toggle: scene.toggle ?? false,
    disabled: scene.disabled ?? false,
    softDisabled: scene.softDisabled ?? false,
    loading: scene.loading ?? false,
    defaultPressed: scene.pressed ?? false,
  };
  const state = button.initialState(config);
  const ids = { root: 'wc-root', label: 'wc-label', spinner: 'wc-spinner' };
  const aria = button.aria(state, config, ids);
  const classes = buttonClasses(config, state);

  const spinner = scene.loading
    ? `<svg data-part="spinner" id="${ids.spinner}" class="${classes.spinner}" viewBox="0 0 24 24"${attrsOf(aria.spinner ?? {})}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`
    : '';
  const content = scene.ariaLabel
    ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor"></path></svg>'
    : label;
  const rootAttrs =
    attrsOf(aria.root ?? {}) +
    (scene.disabled ? ' disabled' : '') +
    (scene.ariaLabel ? ` aria-label="${scene.ariaLabel}"` : '');

  document.body.innerHTML = `
    <main>
      <rafters-button>
        <button type="button" data-part="root" id="${ids.root}" class="${classes.root}"${rootAttrs}>
          ${spinner}<span data-part="label" id="${ids.label}">${content}</span>
        </button>
      </rafters-button>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
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
