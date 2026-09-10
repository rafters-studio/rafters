import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Grid } from '../../../src/components/grid/grid';

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  [
    'linear three columns',
    () => (
      <Grid columns={3} gap="4">
        <Grid.Item>Card 1</Grid.Item>
        <Grid.Item>Card 2</Grid.Item>
        <Grid.Item>Card 3</Grid.Item>
      </Grid>
    ),
  ],
  [
    'golden with a hero',
    () => (
      <Grid preset="golden">
        <Grid.Item priority="secondary">Rail</Grid.Item>
        <Grid.Item priority="primary">Hero</Grid.Item>
      </Grid>
    ),
  ],
  [
    'bento dashboard',
    () => (
      <Grid preset="bento" pattern="dashboard">
        <Grid.Item priority="primary">Metric</Grid.Item>
        <Grid.Item priority="secondary">Chart</Grid.Item>
        <Grid.Item priority="tertiary">Feed</Grid.Item>
      </Grid>
    ),
  ],
  [
    'explicit spans',
    () => (
      <Grid columns={4} padding="2">
        <Grid.Item colSpan={2} rowSpan={2} priority="primary">
          Wide
        </Grid.Item>
        <Grid.Item>Narrow</Grid.Item>
      </Grid>
    ),
  ],
  [
    'role=grid with text cells',
    () => (
      <Grid role="grid" columns={2} aria-label="Cells">
        <span>a</span>
        <span>b</span>
        <span>c</span>
        <span>d</span>
      </Grid>
    ),
  ],
  [
    'role=grid with button cells',
    () => (
      <Grid role="grid" columns={2} aria-label="Photo picker">
        <button type="button">One</button>
        <button type="button">Two</button>
        <button type="button">Three</button>
      </Grid>
    ),
  ],
];

for (const [name, scene] of scenes) {
  test(`grid ${name}`, async ({ task }) => {
    const { container } = await render(<main>{scene()}</main>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
