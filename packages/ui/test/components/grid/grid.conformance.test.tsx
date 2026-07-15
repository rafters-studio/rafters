import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Grid } from '../../../src/components/grid/grid';
import { assertAxeClean, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('grid conformance [react]', () => {
  it('layout grid: silent furniture, priority projected onto items', async () => {
    render(
      <main>
        <Grid preset="bento" pattern="dashboard">
          <Grid.Item priority="primary">Metric</Grid.Item>
          <Grid.Item priority="secondary">Chart</Grid.Item>
          <Grid.Item priority="tertiary">Feed</Grid.Item>
        </Grid>
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.getAttribute('data-preset')).toBe('bento');
    const items = root.querySelectorAll('[data-priority]');
    expect(items).toHaveLength(3);
    expect(items[0]?.getAttribute('data-priority')).toBe('primary');
    await assertAxeClean(body());
  });

  it('reordering the tree does not change which item is the hero', () => {
    render(
      <Grid preset="golden">
        <Grid.Item priority="secondary">Rail</Grid.Item>
        <Grid.Item priority="primary">Hero</Grid.Item>
      </Grid>,
    );
    // The placement selector targets [data-priority=primary] regardless of
    // position -- the second child carries the declaration.
    const hero = body().querySelector('[data-priority="primary"]');
    expect(hero?.textContent).toBe('Hero');
  });

  it('role=grid: rows and gridcells rendered, structure axe-clean', async () => {
    render(
      <main>
        <Grid role="grid" columns={2} aria-label="Photo picker">
          <button type="button">One</button>
          <button type="button">Two</button>
          <button type="button">Three</button>
        </Grid>
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-label')).toBe('Photo picker');
    expect(root.querySelectorAll('[role="row"]')).toHaveLength(2);
    expect(root.querySelectorAll('[role="gridcell"]')).toHaveLength(3);
    await assertAxeClean(body());
  });

  it('role=grid: arrow keys rove in two dimensions', async () => {
    const user = userEvent.setup();
    render(
      <Grid role="grid" columns={2} aria-label="Cells">
        <span>a</span>
        <span>b</span>
        <span>c</span>
        <span>d</span>
      </Grid>,
    );
    const cells = Array.from(body().querySelectorAll<HTMLElement>('[role="gridcell"]'));
    expect(cells[0]?.getAttribute('tabindex')).toBe('0');
    expect(cells[1]?.getAttribute('tabindex')).toBe('-1');

    cells[0]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cells[1]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cells[3]);
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(cells[2]);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(cells[0]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(cells[3]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(cells[0]);
  });

  it('explicit spans compose with priority on items', () => {
    render(
      <Grid columns={4}>
        <Grid.Item colSpan={2} rowSpan={2} priority="primary">
          Wide
        </Grid.Item>
      </Grid>,
    );
    const item = body().querySelector('[data-priority="primary"]');
    expect(item?.className).toContain('col-span-2');
    expect(item?.className).toContain('row-span-2');
  });
});
