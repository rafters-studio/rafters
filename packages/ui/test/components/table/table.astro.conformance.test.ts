/**
 * Astro performance of the Table score. Table is a PURE STATIC -- the score
 * projects no ARIA onto the root, holds no state, runs no effects -- so its
 * Astro file ships NO <script> and there is NO bindTable. This test renders the
 * server markup and asserts the contract a static table carries: the root
 * region renders, projects no ARIA, and -- with the semantic tree composed in
 * the default slot using the shared class strings and tableRowAttrs -- the
 * per-row selected projection holds and the whole thing is axe-clean. One
 * score, two performances (React + Astro); here the performance is markup +
 * classes + slot, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Table from '../../../src/components/table/table.astro';
import { tableRowAttrs } from '../../../src/components/table/table.behavior';
import {
  tableBodyClasses,
  tableCaptionClasses,
  tableCellClasses,
  tableHeadClasses,
  tableHeaderClasses,
  tableRowClasses,
} from '../../../src/components/table/table.classes';
import {
  assertAxeClean,
  assertInstanceContractFulfillment,
  partElement,
} from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

/** The selected state of each row, keyed in DOM order. Header rows are never
 *  selected; the two body rows exercise both branches of the projection. */
const selectedByKey: Record<string, boolean> = { header: false, ada: true, grace: false };

/** A `<tr>` carrying data-part="row" and the tableRowAttrs projection -- the
 *  same projection the React Table.Row spreads, applied here in Astro's
 *  composition model (raw semantic elements wearing the shared classes). */
function tr(key: string, cells: string): string {
  const attrs = tableRowAttrs(selectedByKey[key]);
  const selected = attrs['aria-selected']
    ? ` aria-selected="${String(attrs['aria-selected'])}"`
    : '';
  const dataState = attrs['data-state'] ? ` data-state="${String(attrs['data-state'])}"` : '';
  return `<tr data-part="row" class="${tableRowClasses}"${selected}${dataState}>${cells}</tr>`;
}

function tableMarkup(): string {
  return [
    `<caption class="${tableCaptionClasses}">Recent signups</caption>`,
    `<thead class="${tableHeaderClasses}">${tr('header', `<th scope="col" class="${tableHeadClasses}">Name</th>`)}</thead>`,
    `<tbody class="${tableBodyClasses}">`,
    tr('ada', `<td class="${tableCellClasses}">Ada</td>`),
    tr('grace', `<td class="${tableCellClasses}">Grace</td>`),
    `</tbody>`,
  ].join('');
}

async function render(
  props: Record<string, unknown> = {},
  slotDefault = tableMarkup(),
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Table, { props, slots: { default: slotDefault } });
  // A table is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('table conformance [astro]', () => {
  it('renders a root table part carrying the shared root/wrapper classes', async () => {
    const dom = await render();
    const root = partElement(dom, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName).toBe('TABLE');
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('ts-body-small');
    expect((root.parentElement as HTMLElement).className).toContain('overflow-auto');
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const dom = await render();
    const root = partElement(dom, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('a selected row projects aria-selected and data-state; header/unselected project neither', async () => {
    const dom = await render();
    const root = partElement(dom, 'root') as HTMLElement;
    assertInstanceContractFulfillment(root, 'row', ['header', 'ada', 'grace'], (key) =>
      tableRowAttrs(selectedByKey[key]),
    );
  });

  it('slotted semantic content projects into the table', async () => {
    const dom = await render();
    const root = partElement(dom, 'root') as HTMLElement;
    expect(root.querySelector('caption')?.textContent).toBe('Recent signups');
    expect(root.querySelector('thead th')?.getAttribute('scope')).toBe('col');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const dom = await render();
    await assertAxeClean(dom);
  });
});
