import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Table from '../../../src/components/table/table.astro';
import { tableRowAttrs } from '../../../src/components/table/table.behavior';
import {
  tableBodyClasses,
  tableCaptionClasses,
  tableCellClasses,
  tableFooterClasses,
  tableHeadClasses,
  tableHeaderClasses,
  tableRowClasses,
} from '../../../src/components/table/table.classes';

interface Scene {
  caption?: boolean;
  header?: boolean;
  footer?: boolean;
  sortable?: boolean;
  selected?: string[];
}

const ROWS: ReadonlyArray<[string, string, string]> = [
  ['ada', 'Ada', 'Active'],
  ['grace', 'Grace', 'Invited'],
  ['linus', 'Linus', 'Active'],
];

/** A <tr> carrying data-part="row" and the tableRowAttrs projection -- the
 *  same composition the astro conformance test slots into the table. */
function tr(selected: boolean, cells: string): string {
  const attrs = tableRowAttrs(selected);
  const ariaSelected = attrs['aria-selected']
    ? ` aria-selected="${String(attrs['aria-selected'])}"`
    : '';
  const dataState = attrs['data-state'] ? ` data-state="${String(attrs['data-state'])}"` : '';
  return `<tr data-part="row" class="${tableRowClasses}"${ariaSelected}${dataState}>${cells}</tr>`;
}

function tableMarkup({
  caption = true,
  header = true,
  footer = false,
  sortable = false,
  selected = [],
}: Scene): string {
  const parts: string[] = [];
  if (caption) parts.push(`<caption class="${tableCaptionClasses}">Recent signups</caption>`);
  if (header) {
    const sort = sortable ? ' aria-sort="ascending"' : '';
    parts.push(
      `<thead class="${tableHeaderClasses}">${tr(
        false,
        `<th scope="col" class="${tableHeadClasses}"${sort}>Name</th><th scope="col" class="${tableHeadClasses}">Status</th>`,
      )}</thead>`,
    );
  }
  parts.push(`<tbody class="${tableBodyClasses}">`);
  for (const [key, name, status] of ROWS) {
    parts.push(
      tr(
        selected.includes(key),
        `<td class="${tableCellClasses}">${name}</td><td class="${tableCellClasses}">${status}</td>`,
      ),
    );
  }
  parts.push('</tbody>');
  if (footer) {
    parts.push(
      `<tfoot class="${tableFooterClasses}">${tr(
        false,
        `<td class="${tableCellClasses}">3 people</td><td class="${tableCellClasses}">2 active</td>`,
      )}</tfoot>`,
    );
  }
  return parts.join('');
}

async function mount(scene: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Table, {
    props: {},
    slots: { default: tableMarkup(scene) },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A table is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // Table is a pure static: no bindTable exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['caption, header and body', {}],
  ['full family with footer', { footer: true }],
  ['no caption', { caption: false }],
  ['body only', { caption: false, header: false }],
  ['sortable column header', { sortable: true }],
  ['selected rows', { selected: ['ada', 'linus'] }],
];

for (const [name, scene] of scenes) {
  test(`table.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
