import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Skeleton } from '../../../src/components/skeleton/skeleton';

// Skeleton is a decorative leaf: the score projects aria-hidden on every
// instance, so there is no labelled form -- only sizing and composition vary.
const scenes: ReadonlyArray<[string, () => React.ReactElement]> = [
  ['default leaf', () => <Skeleton />],
  ['sized line', () => <Skeleton className="h-4 w-48" />],
  ['round avatar placeholder', () => <Skeleton className="h-12 w-12 rounded-full" />],
  [
    'several placeholders beside text',
    () => (
      <>
        <p>Loading the profile.</p>
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </>
    ),
  ],
];

for (const [name, scene] of scenes) {
  test(`skeleton ${name}`, async ({ task }) => {
    const { container } = await render(<main>{scene()}</main>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
