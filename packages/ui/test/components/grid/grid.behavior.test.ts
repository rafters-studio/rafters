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

describe('grid effects', () => {
  it('presentation grids have no effects', () => {
    expect(grid.effects(state, { columns: 3 })).toEqual([]);
    expect(grid.effects(state, { columns: { base: 2, md: 4 } })).toEqual([]);
  });

  it('role=grid with fixed columns wires 2D roving', () => {
    expect(grid.effects(state, { role: 'grid', columns: 4, ariaLabel: 'x' })).toEqual([
      { type: 'grid-roving', part: 'root', columns: 4 },
    ]);
  });

  it('role=grid without fixed columns wires NOTHING (honesty gate)', () => {
    expect(grid.effects(state, { role: 'grid', columns: 'auto', ariaLabel: 'x' })).toEqual([]);
  });
});

describe('grid item projection', () => {
  it('items declare their priority through data-priority', () => {
    expect(gridItemAttrs('primary')).toEqual({ 'data-priority': 'primary' });
    expect(gridItemAttrs(undefined)).toEqual({ 'data-priority': undefined });
  });
});
