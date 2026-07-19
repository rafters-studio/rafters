import { describe, expect, it } from 'vitest';
import { grid, gridItemAttrs, type GridConfig } from '../../../src/components/grid/grid.behavior';

const state = {};

describe('grid parts', () => {
  it('declares root and the grid-mode row/cell structure', () => {
    expect(Object.keys(grid.parts).sort()).toEqual(['cell', 'root', 'row']);
    expect(grid.parts.row).toMatchObject({ role: 'row', many: true, optional: true });
    expect(grid.parts.cell).toMatchObject({ role: 'gridcell', many: true, optional: true });
  });
});

describe('grid aria projection', () => {
  it('presentation grids are silent furniture', () => {
    const aria = grid.aria(state, { columns: 3 }, { root: 'r', row: '', cell: '' });
    expect(aria.root?.role).toBeUndefined();
    expect(aria.root?.['aria-label']).toBeUndefined();
    expect(aria.root?.['data-preset']).toBe('linear');
    expect(aria.root?.['data-columns']).toBe('3');
  });

  it('role=grid projects the role and the accessible name', () => {
    const config: GridConfig = { role: 'grid', columns: 4, ariaLabel: 'Photo picker' };
    const aria = grid.aria(state, config, { root: 'r', row: '', cell: '' });
    expect(aria.root?.role).toBe('grid');
    expect(aria.root?.['aria-label']).toBe('Photo picker');
  });
});

// The 2D grid keyboard contract is no longer a declarative effect on the score
// -- the WC/Astro bind and the React controller each compose the roving-focus
// primitive directly (createRovingFocus with its 2D columns option), gated on
// an honest role="grid" with a fixed column count. That behavior (Left/Right
// move by one column, Up/Down by a full row, Home/End to the ends, clamped at
// the edges, presentation/fluid grids stay inert) is asserted end to end in the
// react/wc/astro conformance suites, which drive the real DOM it operates on.

describe('grid item projection', () => {
  it('items declare their priority through data-priority', () => {
    expect(gridItemAttrs('primary')).toEqual({ 'data-priority': 'primary' });
    expect(gridItemAttrs(undefined)).toEqual({ 'data-priority': undefined });
  });
});
