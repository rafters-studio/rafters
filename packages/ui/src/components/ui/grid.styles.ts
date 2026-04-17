/**
 * Shadow DOM style definitions for Grid web component
 *
 * Parallel to grid.classes.ts. Same semantic structure,
 * CSS property maps + container queries instead of Tailwind utilities.
 *
 * Mobile-first: the base rule always declares a single column. Container
 * queries (NOT viewport media queries) step the column count up at increasing
 * container widths so that the grid responds to the size of its parent
 * surface, not the viewport.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type GridCols = 1 | 2 | 3 | 4 | 6 | 12;
export type GridGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
export type GridFlow = 'row' | 'col' | 'dense';

export const GRID_COLS_VALUES: readonly GridCols[] = [1, 2, 3, 4, 6, 12];
export const GRID_GAP_VALUES: readonly GridGap[] = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
export const GRID_FLOW_VALUES: readonly GridFlow[] = ['row', 'col', 'dense'];

export const DEFAULT_GRID_COLS: GridCols = 1;
export const DEFAULT_GRID_GAP: GridGap = 4;
export const DEFAULT_GRID_FLOW: GridFlow = 'row';

export interface GridStylesheetOptions {
  cols?: GridCols;
  gap?: GridGap;
  flow?: GridFlow;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function isMember<T>(allowed: readonly T[], value: unknown): value is T {
  for (const candidate of allowed) {
    if ((candidate as unknown) === value) return true;
  }
  return false;
}

function flowDeclaration(flow: GridFlow): string {
  if (flow === 'col') return 'column';
  if (flow === 'dense') return 'row dense';
  return 'row';
}

function templateColumns(count: number): string {
  return `repeat(${count}, minmax(0, 1fr))`;
}

/**
 * Container-query step-ups. Each entry promotes the column count to
 * `min(target, cap)` once the container is at least `min` wide. Mobile-first:
 * the base rule always renders a single column.
 */
interface ContainerStep {
  min: string;
  cap: number;
}

const CONTAINER_STEPS: readonly ContainerStep[] = [
  { min: '30rem', cap: 2 },
  { min: '48rem', cap: 3 },
  { min: '64rem', cap: 4 },
  { min: '80rem', cap: 6 },
  { min: '96rem', cap: 12 },
];

// ============================================================================
// Base Style Maps
// ============================================================================

export const gridHostBase: CSSProperties = {
  display: 'block',
  'container-type': 'inline-size',
};

export function gridBase(gap: GridGap, flow: GridFlow): CSSProperties {
  return {
    display: 'grid',
    'grid-template-columns': templateColumns(1),
    'grid-auto-flow': flowDeclaration(flow),
    gap: tokenVar(`spacing-${gap}`),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Build the complete grid stylesheet for a given configuration.
 *
 * Pure: identical options always yield identical output.
 * Unknown / out-of-range values fall back to defaults silently.
 */
export function gridStylesheet(options: GridStylesheetOptions = {}): string {
  const cols: GridCols = isMember(GRID_COLS_VALUES, options.cols)
    ? options.cols
    : DEFAULT_GRID_COLS;
  const gap: GridGap = isMember(GRID_GAP_VALUES, options.gap) ? options.gap : DEFAULT_GRID_GAP;
  const flow: GridFlow = isMember(GRID_FLOW_VALUES, options.flow)
    ? options.flow
    : DEFAULT_GRID_FLOW;

  const stepRules: string[] = [];
  for (const step of CONTAINER_STEPS) {
    if (cols < step.cap) continue;
    const count = Math.min(cols, step.cap);
    stepRules.push(
      atRule(
        `@container (min-width: ${step.min})`,
        styleRule('.grid', { 'grid-template-columns': templateColumns(count) }),
      ),
    );
  }

  return stylesheet(
    styleRule(':host', gridHostBase),
    styleRule('.grid', gridBase(gap, flow)),
    ...stepRules,
  );
}
