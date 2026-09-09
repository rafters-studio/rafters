import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/alert/alert.element';
import type { AlertVariant } from '../../../src/components/alert/alert.behavior';

const VARIANTS: ReadonlyArray<AlertVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
];

function mount(attrs: string, slots: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-alert ${attrs}>${slots}</rafters-alert></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const titled =
  '<span slot="title">Saved</span><span slot="description">Your changes were saved.</span>';

for (const variant of VARIANTS) {
  test(`rafters-alert variant=${variant}`, async ({ task }) => {
    const host = mount(`variant="${variant}"`, titled);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('rafters-alert text only', async ({ task }) => {
  const host = mount('', 'Saved.');
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-alert every region empty', async ({ task }) => {
  const host = mount('', '');
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-alert with title, description, and an action control', async ({ task }) => {
  const host = mount(
    'variant="success"',
    `${titled}<button slot="action" type="button">Undo</button>`,
  );
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-alert with a decorative icon', async ({ task }) => {
  const host = mount(
    'variant="destructive"',
    `<svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle></svg>${titled}`,
  );
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
