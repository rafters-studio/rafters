/**
 * React render adapter + the shared grid conformance suite, plus the
 * React-idiomatic scenarios the shared suite cannot express portably
 * (source-order independence, explicit-span composition, arrow-key roving
 * via userEvent -- see conformance-suite.ts's GridAdapter for why these
 * stay local; the WC equivalents live in grid.element.conformance.test.ts).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Grid, type GridProps } from '../../../src/components/grid/grid';
import { partElement } from '../../harness/conformance';
import {
  runGridConformance,
  type GridAdapter,
  type GridChildSpec,
  type GridScenarioProps,
} from './conformance-suite';

type FixedColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

function toGridProps(props: GridScenarioProps): GridProps {
  const shared = { gap: props.gap, padding: props.padding };
  if (props.role === 'grid') {
    return {
      ...shared,
      role: 'grid',
      columns: (props.columns ?? 1) as FixedColumns,
      'aria-label': props.ariaLabel ?? '',
      preset: 'linear',
    };
  }
  return {
    ...shared,
    role: props.role,
    columns: props.columns,
    preset: props.preset,
    pattern: props.pattern,
  };
}

function toChildren(children: GridChildSpec[]): React.ReactNode {
  return children.map((child, index) =>
    child.priority !== undefined || child.colSpan !== undefined || child.rowSpan !== undefined ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: scenario children are positional by definition
      <Grid.Item
        key={index}
        priority={child.priority}
        colSpan={child.colSpan}
        rowSpan={child.rowSpan}
      >
        {child.text}
      </Grid.Item>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: scenario children are positional by definition
      <span key={index}>{child.text}</span>
    ),
  );
}

const reactAdapter: GridAdapter = {
  name: 'react',
  render(props, children) {
    const utils = render(<Grid {...toGridProps(props)}>{toChildren(children)}</Grid>);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

afterEach(() => {
  cleanup();
});

runGridConformance(reactAdapter);

describe('grid conformance [react] framework-specific', () => {
  it('reordering the tree does not change which item is the hero', () => {
    render(
      <Grid preset="golden">
        <Grid.Item priority="secondary">Rail</Grid.Item>
        <Grid.Item priority="primary">Hero</Grid.Item>
      </Grid>,
    );
    const hero = document.body.querySelector('[data-priority="primary"]');
    expect(hero?.textContent).toBe('Hero');
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
    const root = partElement(document.body, 'root') as HTMLElement;
    const cells = Array.from(root.querySelectorAll<HTMLElement>('[role="gridcell"]'));
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
});
