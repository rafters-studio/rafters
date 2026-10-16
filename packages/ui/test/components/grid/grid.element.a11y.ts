import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { gridClasses } from '../../../src/components/grid/grid.classes';
import '../../../src/components/grid/grid.element';

const cell = (text: string): string =>
  `<div data-part="cell" role="gridcell" data-roving-item tabindex="-1">${text}</div>`;
const row = (a: string, b: string): string =>
  `<div data-part="row" role="row" class="contents">${cell(a)}${cell(b)}</div>`;

const scenes: ReadonlyArray<[string, string]> = [
  [
    'layout',
    `<rafters-grid data-part="root" data-grid id="g" data-gap="4" data-preset="linear" data-columns="3" class="${gridClasses({ preset: 'linear', columns: 3, gap: '4' }, {}).root}"><div>A</div><div>B</div><div>C</div></rafters-grid>`,
  ],
  [
    'grid mode',
    `<rafters-grid data-part="root" data-grid id="m" grid-role="grid" data-preset="linear" data-columns="2" aria-label="Metrics" class="${gridClasses({ preset: 'linear', columns: 2, role: 'grid', ariaLabel: 'Metrics' }, {}).root}">${row('1', '2')}${row('3', '4')}</rafters-grid>`,
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-grid ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${markup}</main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
