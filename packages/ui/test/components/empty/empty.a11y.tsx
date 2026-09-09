import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from '../../../src/components/empty/empty';

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <title>search</title>
      <circle cx="11" cy="11" r="8" />
    </svg>
  );
}

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  [
    'full family with an action',
    () => (
      <Empty>
        <EmptyIcon>
          <SearchIcon />
        </EmptyIcon>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>Try adjusting your search terms or filters.</EmptyDescription>
        <EmptyAction>
          <button type="button">Clear filters</button>
        </EmptyAction>
      </Empty>
    ),
  ],
  [
    'informational without an action',
    () => (
      <Empty>
        <EmptyIcon>
          <SearchIcon />
        </EmptyIcon>
        <EmptyTitle>All caught up</EmptyTitle>
        <EmptyDescription>No new notifications.</EmptyDescription>
      </Empty>
    ),
  ],
  [
    'title and description',
    () => (
      <Empty>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create your first project to get started.</EmptyDescription>
      </Empty>
    ),
  ],
  [
    'title at heading level two',
    () => (
      <Empty>
        <EmptyTitle as="h2">Level two</EmptyTitle>
      </Empty>
    ),
  ],
  ['plain text', () => <Empty>nothing here</Empty>],
];

for (const [name, build] of scenes) {
  test(`empty ${name}`, async ({ task }) => {
    const { container } = await render(build());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
