import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/date-picker/date-picker.element';

async function mount(attrs: Record<string, string>): Promise<HTMLElement> {
  const merged: Record<string, string> = {
    today: '2026-07-20',
    'default-month': '2026-07-01',
    ...attrs,
  };
  const attrString = Object.entries(merged)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  document.body.innerHTML = `<main><rafters-date-picker ${attrString}></rafters-date-picker></main>`;
  // The picker binds one microtask after connecting; its nested calendar one later.
  await Promise.resolve();
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Record<string, string>]> = [
  ['closed, nothing selected', {}],
  ['closed with a value', { value: '2026-07-08' }],
  ['open, nothing selected', { 'default-open': 'true' }],
  ['open with a value', { 'default-open': 'true', value: '2026-07-08' }],
  [
    'open range with both ends',
    { 'default-open': 'true', mode: 'range', value: '2026-07-10..2026-07-14' },
  ],
  ['form-associated', { name: 'due', value: '2026-07-08' }],
  ['disabled', { disabled: '' }],
];

for (const [name, attrs] of scenes) {
  test(`rafters-date-picker ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
