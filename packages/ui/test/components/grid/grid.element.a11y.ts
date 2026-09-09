import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/grid/grid.element';

/** A presentation grid: no role, priority declared on the items. */
function presentation(attrs: string): string {
  return `
    <rafters-grid data-part="root" data-grid ${attrs}>
      <div data-priority="primary">Metric</div>
      <div data-priority="secondary">Chart</div>
      <div data-priority="tertiary">Feed</div>
    </rafters-grid>`;
}

/** role="grid" markup is authored pre-chunked: data-grid-role opts in, the
 *  row/gridcell structure already exists, and the binding projects the role. */
function gridMode(cells: ReadonlyArray<string>): string {
  const cell = (content: string) =>
    `<div data-part="cell" role="gridcell" data-roving-item tabindex="-1">${content}</div>`;
  const rows: string[] = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(
      `<div data-part="row" role="row" class="contents">${cells
        .slice(index, index + 2)
        .map(cell)
        .join('')}</div>`,
    );
  }
  return `
    <rafters-grid data-part="root" data-grid data-grid-role="grid" data-columns="2" aria-label="Cells">
      ${rows.join('')}
    </rafters-grid>`;
}

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${markup}</main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['presentation bento dashboard', presentation('data-preset="bento" data-pattern="dashboard"')],
  [
    'presentation linear three columns',
    presentation('data-preset="linear" data-columns="3" data-gap="4"'),
  ],
  ['role=grid with text cells', gridMode(['a', 'b', 'c', 'd'])],
  [
    'role=grid with button cells',
    gridMode([
      '<button type="button">One</button>',
      '<button type="button">Two</button>',
      '<button type="button">Three</button>',
    ]),
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-grid ${name}`, async ({ task }) => {
    const host = await mount(markup);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
