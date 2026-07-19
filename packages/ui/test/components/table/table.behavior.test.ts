import { describe, expect, it } from 'vitest';
import { table, tableRowAttrs } from '../../../src/components/table/table.behavior';

const state = {};
const config = {};

describe('table parts', () => {
  it('declares root and the selectable row structure', () => {
    expect(Object.keys(table.parts).sort()).toEqual(['root', 'row']);
  });

  it('the row part carries NO role -- a native <tr> is role=row implicitly', () => {
    expect(table.parts.row).toMatchObject({ many: true, optional: true });
    expect(table.parts.row.role).toBeUndefined();
  });
});

describe('table aria projection', () => {
  it('the root is a pure static surface -- empty projection, no role', () => {
    const aria = table.aria(state, config, { root: 'r', row: '' });
    expect(aria.root).toEqual({});
    expect(aria.root?.role).toBeUndefined();
  });

  it('does not project a row entry -- rows project per-instance via tableRowAttrs', () => {
    const aria = table.aria(state, config, { root: 'r', row: '' });
    expect(aria.row).toBeUndefined();
  });
});

describe('table has no interactive contract', () => {
  it('claims no keys -- a static score dispatches nothing', () => {
    expect(table.keymap({ key: 'Enter' }, state, 'root', config)).toBeNull();
    expect(table.keymap({ key: 'ArrowDown' }, state, 'row', config)).toBeNull();
  });

  it('runs no effects', () => {
    expect(table.effects(state, config)).toEqual([]);
  });

  it('has no actions and initial state is empty', () => {
    expect(Object.keys(table.actions)).toEqual([]);
    expect(table.initialState(config)).toEqual({});
  });
});

describe('table row projection', () => {
  it('a selected row projects aria-selected and the data-state hook', () => {
    expect(tableRowAttrs(true)).toEqual({
      'aria-selected': 'true',
      'data-state': 'selected',
    });
  });

  it('an unselected row projects NEITHER attribute (absence, not false)', () => {
    expect(tableRowAttrs(false)).toEqual({
      'aria-selected': undefined,
      'data-state': undefined,
    });
    expect(tableRowAttrs(undefined)).toEqual({
      'aria-selected': undefined,
      'data-state': undefined,
    });
  });
});
