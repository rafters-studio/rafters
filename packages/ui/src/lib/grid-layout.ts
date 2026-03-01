/**
 * Grid layout utility - computes span assignments for clean bento fills
 *
 * Pure computation, no DOM or React dependency. Given a column count,
 * item count, and priority scores, produces colSpan/rowSpan assignments
 * that fill the grid with zero empty cells while giving visual hierarchy
 * to high-priority items.
 */

export interface LayoutItem {
  colSpan: 1 | 2 | 3 | 4;
  rowSpan: 1 | 2 | 3;
}

export interface ComputeLayoutOptions {
  /** Number of grid columns (1-6) */
  columns: number;
  /** Total number of items to place */
  itemCount: number;
  /** Priority scores per item (higher = more prominent). Index-aligned. */
  priorities: number[];
  /** Minimum priority score required for wide treatment (colSpan > 1). Default: 3 */
  wideThreshold?: number;
  /** Minimum priority score required for tall treatment (rowSpan > 1). Default: top scorer */
  tallThreshold?: number;
}

/**
 * Returns span assignments for each item, ensuring:
 * - Total cells consumed = rows * columns (no empty cells)
 * - Top scorer gets rowSpan=2 (tall) when itemCount >= 6
 * - Remaining extras distributed as colSpan=2 (wide) to next highest scorers
 * - When base grid has no extras (itemCount % columns === 0), adds a row
 */
export function computeGridLayout(options: ComputeLayoutOptions): LayoutItem[] {
  const { columns, itemCount, priorities, wideThreshold = 3 } = options;

  if (itemCount === 0) return [];

  if (columns < 1 || columns > 6 || !Number.isInteger(columns)) {
    throw new RangeError('columns must be between 1 and 6');
  }

  if (priorities.length !== itemCount) {
    throw new RangeError('priorities length must match itemCount');
  }

  // Start with all items as 1x1
  const result: LayoutItem[] = Array.from({ length: itemCount }, () => ({
    colSpan: 1 as const,
    rowSpan: 1 as const,
  }));

  // Not enough items for hierarchy
  if (itemCount < 6) return result;

  // Sort indices by priority (descending), stable by original index
  const sortedIndices = Array.from({ length: itemCount }, (_, i) => i).sort((a, b) => {
    const pa = priorities[a] ?? 0;
    const pb = priorities[b] ?? 0;
    return pb - pa || a - b;
  });

  // Calculate base rows and extras
  const baseRows = Math.ceil(itemCount / columns);
  let extras = baseRows * columns - itemCount;

  // Perfect fill: add a row to create hierarchy space
  if (extras === 0) {
    extras = columns;
  }

  // Top scorer gets tall (rowSpan=2) -- costs 1 extra cell
  const topIndex = sortedIndices[0];
  if (topIndex !== undefined) {
    result[topIndex] = { colSpan: 1, rowSpan: 2 };
    extras -= 1;
  }

  // Distribute remaining extras as wide (colSpan=2) to next highest scorers
  for (let i = 1; i < sortedIndices.length && extras > 0; i++) {
    const idx = sortedIndices[i];
    if (idx === undefined) continue;
    if ((priorities[idx] ?? 0) >= wideThreshold) {
      result[idx] = { colSpan: 2, rowSpan: 1 };
      extras -= 1;
    }
  }

  // If we still have extras (not enough items above threshold), assign to next highest
  for (let i = 1; i < sortedIndices.length && extras > 0; i++) {
    const idx = sortedIndices[i];
    if (idx === undefined) continue;
    const item = result[idx];
    if (item && item.colSpan === 1 && item.rowSpan === 1) {
      result[idx] = { colSpan: 2, rowSpan: 1 };
      extras -= 1;
    }
  }

  return result;
}
