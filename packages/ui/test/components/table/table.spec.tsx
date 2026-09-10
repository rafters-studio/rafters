/**
 * React performance of the table score, driven end to end. Table is a pure
 * static -- no state, no keymap -- so this is the structure + aria contract,
 * plus the per-row selected projection and the classy merge.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Table } from '../../../src/components/table/table';
import { table, tableRowAttrs } from '../../../src/components/table/table.behavior';

const body = () => document.body;

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
  if (root.getAttribute('data-part') === part) all.unshift(root);
  return all;
}

/** Bespoke many-part driver (Spec 01, table is a uniform-item family): every
 *  rendered `row` instance's ARIA equals `tableRowAttrs(selected)`. */
function assertRowContractFulfillment(
  root: HTMLElement,
  instanceKeys: readonly string[],
  instanceAria: (key: string) => Record<string, string | boolean | undefined>,
): void {
  const elements = partElements(root, 'row');
  expect(elements.length, 'many part "row": rendered instances must match supplied keys').toBe(
    instanceKeys.length,
  );
  for (const [i, key] of instanceKeys.entries()) {
    const element = elements[i];
    expect(element, `instance "${key}" of part "row"`).toBeDefined();
    if (!element) continue;
    for (const [attr, value] of Object.entries(instanceAria(key))) {
      if (value === undefined) {
        expect(
          element.hasAttribute(attr),
          `instance "${key}" of "row" must NOT render ${attr}`,
        ).toBe(false);
      } else {
        expect(element.getAttribute(attr), `instance "${key}" of "row" ${attr}`).toBe(
          String(value),
        );
      }
    }
  }
}

afterEach(() => {
  cleanup();
});

describe('table conformance [react]', () => {
  it('fulfills the contract: root renders (role=table native) and projects NO ARIA', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root, 'declared part "root" must be rendered').not.toBeNull();
    const projection = table.aria({}, {}, { root: root.id, row: '' })['root'];
    for (const [attr, value] of Object.entries(projection ?? {})) {
      if (value === undefined) {
        expect(root.hasAttribute(attr), `root must NOT render ${attr}`).toBe(false);
      } else {
        expect(root.getAttribute(attr), `root ${attr}`).toBe(String(value));
      }
    }
    // The empty projection means no explicit role/aria-* leaks onto the table;
    // the semantics are native to the element tree.
    expect(root.tagName).toBe('TABLE');
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('composes the full family with native landmarks', () => {
    render(
      <main>
        <Table>
          <Table.Caption>Recent signups</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head scope="col">Name</Table.Head>
              <Table.Head scope="col">Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Ada</Table.Cell>
              <Table.Cell>Active</Table.Cell>
            </Table.Row>
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.Cell>1 person</Table.Cell>
              <Table.Cell>1 active</Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.querySelector('caption')?.textContent).toBe('Recent signups');
    expect(root.querySelectorAll('thead th')).toHaveLength(2);
    expect(root.querySelector('thead th')?.getAttribute('scope')).toBe('col');
    expect(root.querySelector('tbody td')?.textContent).toBe('Ada');
  });

  it('a selected row projects aria-selected and data-state; unselected rows project neither', () => {
    const selectedByKey: Record<string, boolean> = { ada: true, grace: false, linus: true };
    render(
      <Table>
        <Table.Body>
          <Table.Row selected={selectedByKey.ada}>
            <Table.Cell>Ada</Table.Cell>
          </Table.Row>
          <Table.Row selected={selectedByKey.grace}>
            <Table.Cell>Grace</Table.Cell>
          </Table.Row>
          <Table.Row selected={selectedByKey.linus}>
            <Table.Cell>Linus</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    assertRowContractFulfillment(root, ['ada', 'grace', 'linus'], (key) =>
      tableRowAttrs(selectedByKey[key]),
    );
  });

  it('only root and rows are declared parts -- cells and sections carry no data-part', () => {
    render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head scope="col">H</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>c</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    // The table itself is the root part; its only data-part descendants are the
    // two rows (header + body). No cell or section carries a data-part.
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part="row"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-part]')).toHaveLength(2);
    // Cells/sections use data-slot, never data-part.
    expect(root.querySelector('th')?.hasAttribute('data-part')).toBe(false);
    expect(root.querySelector('td')?.hasAttribute('data-part')).toBe(false);
  });

  it('consumer className merges via classy on every part', () => {
    render(
      <Table className="mt-4">
        <Table.Body>
          <Table.Row className="font-bold">
            <Table.Cell className="text-right">c</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('mt-4');
    expect(body().querySelector('[data-part="row"]')?.className).toContain('font-bold');
    expect(body().querySelector('td')?.className).toContain('text-right');
  });
});
