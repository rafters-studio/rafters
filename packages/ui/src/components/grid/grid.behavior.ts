import type { AriaAttrs, BehaviorSpec } from '../../lib/contract';
import type { EffectSpec } from '../../lib/effects';

/**
 * Grid: named attention structures over a 12-column vocabulary. A static
 * score -- no state, no actions, no keymap -- but the structure contract
 * (roles, per-instance priority projection, the grid-roving keyboard
 * effect) is behavior, and the harness audits it here.
 *
 * Ruled 2026-07-03:
 * - columns are whatever the agent wants, 1-12 (the literal class ceiling
 *   and the span denominator); Miller's-law limits are advice in the
 *   intelligence layer, never enforcement.
 * - item priority is 100% behavior: items DECLARE what they are
 *   (data-priority projection), decoration places them. The oracle's
 *   [&>*:first-child] positional magic is defect-do-not-port.
 * - role="grid" is honest or absent: fixed columns only (type-gated in the
 *   performance), row/gridcell structure, 2D roving keyboard.
 */

export type GridPreset = 'linear' | 'golden' | 'bento';
export type BentoPattern = 'editorial' | 'dashboard' | 'feature' | 'portfolio';
export type ContentPriority = 'primary' | 'secondary' | 'tertiary';

export type ColumnsValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto';

export interface ResponsiveColumnsObject {
  base?: ColumnsValue | undefined;
  sm?: ColumnsValue | undefined;
  md?: ColumnsValue | undefined;
  lg?: ColumnsValue | undefined;
  xl?: ColumnsValue | undefined;
  '2xl'?: ColumnsValue | undefined;
}

export type ResponsiveColumns = ColumnsValue | ResponsiveColumnsObject;

export type SpacingValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';

export interface GridConfig {
  preset?: GridPreset | undefined;
  pattern?: BentoPattern | undefined;
  columns?: ResponsiveColumns | undefined;
  gap?: SpacingValue | undefined;
  padding?: SpacingValue | undefined;
  /** 'grid' promises the ARIA grid pattern: fixed columns, row/gridcell
   *  structure, arrow-key navigation. The performance type-gates it. */
  role?: 'presentation' | 'grid' | undefined;
  /** Accessible name; required with role='grid' (type-gated). */
  ariaLabel?: string | undefined;
}

export type GridState = Record<never, never>;
export type GridActions = Record<never, never>;
export type GridPart = 'root' | 'row' | 'cell';

function fixedColumns(config: GridConfig): number | null {
  return typeof config.columns === 'number' ? config.columns : null;
}

export const grid: BehaviorSpec<GridConfig, GridState, GridActions, GridPart> = {
  name: 'grid',
  parts: {
    root: {},
    // Present only in role='grid' mode; the harness asserts their roles.
    row: { role: 'row', many: true, optional: true },
    cell: { role: 'gridcell', many: true, optional: true },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: (_state, config) => ({
    root: {
      role: config.role === 'grid' ? 'grid' : undefined,
      'aria-label': config.role === 'grid' ? config.ariaLabel : undefined,
      'data-preset': config.preset ?? 'linear',
      'data-columns': typeof config.columns === 'number' ? String(config.columns) : undefined,
    },
  }),
  keymap: () => null,
  effects: (_state, config): EffectSpec[] => {
    const columns = fixedColumns(config);
    if (config.role !== 'grid' || columns === null) return [];
    return [{ type: 'grid-roving', part: 'root', columns }];
  },
};

/** Per-instance projection for grid items: the item DECLARES its priority;
 *  the stock layouts in grid.classes.ts key placement off the projected
 *  attribute, never off source position. */
export function gridItemAttrs(priority: ContentPriority | undefined): AriaAttrs {
  return { 'data-priority': priority };
}
