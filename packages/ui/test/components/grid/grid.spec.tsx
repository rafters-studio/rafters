/**
 * Ported conformance for Grid, React target. Grid is a static score -- no
 * state, no actions, no keymap action -- but the structure contract (roles,
 * per-instance priority projection, the 2D roving keyboard navigation) is
 * behavior this proves end to end.
 */
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Grid } from '../../../src/components/grid/grid';

function pressKey(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

test('layout grid: silent furniture, priority projected onto items', async () => {
  const { container } = await render(
    <main>
      <Grid preset="bento" pattern="dashboard">
        <Grid.Item priority="primary">Metric</Grid.Item>
        <Grid.Item priority="secondary">Chart</Grid.Item>
        <Grid.Item priority="tertiary">Feed</Grid.Item>
      </Grid>
    </main>,
  );
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.hasAttribute('role')).toBe(false);
  expect(root.getAttribute('data-preset')).toBe('bento');
  const items = root.querySelectorAll('[data-priority]');
  expect(items).toHaveLength(3);
  expect(items[0]?.getAttribute('data-priority')).toBe('primary');
});

test('reordering the tree does not change which item is the hero', async () => {
  const { container } = await render(
    <Grid preset="golden">
      <Grid.Item priority="secondary">Rail</Grid.Item>
      <Grid.Item priority="primary">Hero</Grid.Item>
    </Grid>,
  );
  // The placement selector targets [data-priority=primary] regardless of
  // position -- the second child carries the declaration.
  const hero = container.querySelector('[data-priority="primary"]');
  expect(hero?.textContent).toBe('Hero');
});

test('role=grid: rows and gridcells rendered', async () => {
  const { container } = await render(
    <main>
      <Grid role="grid" columns={2} aria-label="Photo picker">
        <button type="button">One</button>
        <button type="button">Two</button>
        <button type="button">Three</button>
      </Grid>
    </main>,
  );
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.getAttribute('role')).toBe('grid');
  expect(root.getAttribute('aria-label')).toBe('Photo picker');
  expect(root.querySelectorAll('[role="row"]')).toHaveLength(2);
  expect(root.querySelectorAll('[role="gridcell"]')).toHaveLength(3);
});

test('role=grid: arrow keys rove in two dimensions', async () => {
  const { container } = await render(
    <Grid role="grid" columns={2} aria-label="Cells">
      <span>a</span>
      <span>b</span>
      <span>c</span>
      <span>d</span>
    </Grid>,
  );
  const cells = Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"]'));
  expect(cells[0]?.getAttribute('tabindex')).toBe('0');
  expect(cells[1]?.getAttribute('tabindex')).toBe('-1');

  cells[0]?.focus();
  pressKey(cells[0] as HTMLElement, 'ArrowRight');
  expect(document.activeElement).toBe(cells[1]);
  pressKey(cells[1] as HTMLElement, 'ArrowDown');
  expect(document.activeElement).toBe(cells[3]);
  pressKey(cells[3] as HTMLElement, 'ArrowLeft');
  expect(document.activeElement).toBe(cells[2]);
  pressKey(cells[2] as HTMLElement, 'ArrowUp');
  expect(document.activeElement).toBe(cells[0]);
  pressKey(cells[0] as HTMLElement, 'End');
  expect(document.activeElement).toBe(cells[3]);
  pressKey(cells[3] as HTMLElement, 'Home');
  expect(document.activeElement).toBe(cells[0]);
});

test('explicit spans compose with priority on items', async () => {
  const { container } = await render(
    <Grid columns={4}>
      <Grid.Item colSpan={2} rowSpan={2} priority="primary">
        Wide
      </Grid.Item>
    </Grid>,
  );
  const item = container.querySelector('[data-priority="primary"]');
  expect(item?.className).toContain('col-span-2');
  expect(item?.className).toContain('row-span-2');
});
