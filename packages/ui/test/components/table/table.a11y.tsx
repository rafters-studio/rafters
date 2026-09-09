import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Table } from '../../../src/components/table/table';

interface SceneProps {
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

/** A table is not a landmark; the page around it supplies the region. */
function Scene({
  caption = true,
  header = true,
  footer = false,
  sortable = false,
  selected = [],
}: SceneProps) {
  return (
    <main>
      <Table>
        {caption && <Table.Caption>Recent signups</Table.Caption>}
        {header && (
          <Table.Header>
            <Table.Row>
              <Table.Head scope="col" aria-sort={sortable ? 'ascending' : undefined}>
                Name
              </Table.Head>
              <Table.Head scope="col">Status</Table.Head>
            </Table.Row>
          </Table.Header>
        )}
        <Table.Body>
          {ROWS.map(([key, name, status]) => (
            <Table.Row key={key} selected={selected.includes(key)}>
              <Table.Cell>{name}</Table.Cell>
              <Table.Cell>{status}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        {footer && (
          <Table.Footer>
            <Table.Row>
              <Table.Cell>3 people</Table.Cell>
              <Table.Cell>2 active</Table.Cell>
            </Table.Row>
          </Table.Footer>
        )}
      </Table>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['caption, header and body', {}],
  ['full family with footer', { footer: true }],
  ['no caption', { caption: false }],
  ['body only', { caption: false, header: false }],
  ['sortable column header', { sortable: true }],
  ['selected rows', { selected: ['ada', 'linus'] }],
];

for (const [name, props] of scenes) {
  test(`table ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
