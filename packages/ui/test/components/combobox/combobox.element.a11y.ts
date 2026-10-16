import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/combobox/combobox.element';

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-combobox ${attrs}>
        <rafters-combobox-input aria-label="Framework" placeholder="Search framework"></rafters-combobox-input>
        <rafters-combobox-content>
          <rafters-combobox-empty>None</rafters-combobox-empty>
          <rafters-combobox-item value="react">React</rafters-combobox-item>
          <rafters-combobox-item value="vue">Vue</rafters-combobox-item>
        </rafters-combobox-content>
      </rafters-combobox>
    </main>`;
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

const input = () =>
  document.body.querySelector<HTMLInputElement>('[data-part="input"]') as HTMLInputElement;

afterEach(() => {
  document.body.innerHTML = '';
});

test('rafters-combobox closed', async ({ task }) => {
  const results = await runAxe(await mount());
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-combobox open', async ({ task }) => {
  const main = await mount();
  await userEvent.click(document.body.querySelector('[data-part="trigger"]') as HTMLElement);
  const results = await runAxe(main);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-combobox highlighted', async ({ task }) => {
  const main = await mount();
  input().focus();
  await userEvent.keyboard('{ArrowDown}');
  const results = await runAxe(main);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-combobox filtered to empty', async ({ task }) => {
  const main = await mount();
  await userEvent.type(input(), 'zzz');
  const results = await runAxe(main);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-combobox disabled', async ({ task }) => {
  const results = await runAxe(await mount('disabled'));
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
