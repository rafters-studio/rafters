import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Button from '../../../src/components/button/button.astro';
import {
  bindButton,
  type ButtonSize,
  type ButtonVariant,
} from '../../../src/components/button/button.behavior';

const VARIANTS: ReadonlyArray<ButtonVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
];

const TEXT_SIZES: ReadonlyArray<ButtonSize> = ['default', 'xs', 'sm', 'lg'];
const ICON_SIZES: ReadonlyArray<ButtonSize> = ['icon', 'icon-xs', 'icon-sm', 'icon-lg'];

const ICON =
  '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor"></path></svg>';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Button, {
    props: { id: 'b', label: 'Save changes', ...props },
    slots,
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindButton(document.querySelector('button[data-part="root"]') as HTMLElement);
  return document;
}

for (const variant of VARIANTS) {
  test(`button.astro variant=${variant}`, async ({ task }) => {
    const document = await mount({ variant });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of TEXT_SIZES) {
  test(`button.astro size=${size}`, async ({ task }) => {
    const document = await mount({ size });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of ICON_SIZES) {
  test(`button.astro size=${size} icon-only with an accessible name`, async ({ task }) => {
    const document = await mount({ size, label: '', 'aria-label': 'Close' }, { default: ICON });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const states: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['loading', { loading: true }],
  ['toggle unpressed', { toggle: true }],
  ['toggle pressed', { toggle: true, defaultPressed: true }],
  ['soft-disabled', { softDisabled: true }],
  ['hard disabled', { disabled: true }],
];

for (const [name, props] of states) {
  test(`button.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
