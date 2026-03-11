/**
 * Contrast Matrix primitive
 * Renders a WCAG contrast pairing matrix as an accessible grid
 *
 * Framework-agnostic, SSR-safe. Builds an 11x11 grid where each cell
 * represents a scale-position pair and indicates whether the pairing
 * meets WCAG AA, AAA, or fails contrast requirements.
 *
 * @example
 * ```typescript
 * const cleanup = createContrastMatrix(container, {
 *   accessibility: colorValue.accessibility,
 *   scaleName: 'ocean-blue',
 * });
 * ```
 */

import type { CleanupFunction } from './types';

const SCALE_KEYS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;
type ScalePosition = (typeof SCALE_KEYS)[number];

interface ContrastOnBackground {
  wcagAA: boolean;
  wcagAAA: boolean;
  contrastRatio: number;
}

interface WcagPairings {
  normal: number[][];
  large: number[][];
}

interface ApcaData {
  onWhite: number;
  onBlack: number;
  minFontSize: number;
}

export interface ContrastMatrixOptions {
  accessibility: {
    onWhite: ContrastOnBackground;
    onBlack: ContrastOnBackground;
    wcagAA?: WcagPairings;
    wcagAAA?: WcagPairings;
    apca?: ApcaData;
  };
  scaleName: string;
}

/**
 * Build a pair key for set lookup
 */
function pairKey(i: number, j: number): string {
  return `${i}-${j}`;
}

/**
 * Build a lookup set from an array of [i, j] pairs.
 * Adds both directions since the matrix is symmetric.
 */
function buildPairSet(pairs: number[][]): Set<string> {
  const set = new Set<string>();
  for (const pair of pairs) {
    const a = pair[0];
    const b = pair[1];
    if (a !== undefined && b !== undefined) {
      set.add(pairKey(a, b));
      set.add(pairKey(b, a));
    }
  }
  return set;
}

/**
 * Determine the WCAG level for a cell at [row, col]
 */
function classifyCell(
  row: number,
  col: number,
  aaSet: Set<string>,
  aaaSet: Set<string>,
): 'aaa' | 'aa' | 'fail' {
  const key = pairKey(row, col);
  if (aaaSet.has(key)) return 'aaa';
  if (aaSet.has(key)) return 'aa';
  return 'fail';
}

/**
 * Format the aria-label for a grid cell
 */
function cellLabel(
  rowPos: ScalePosition,
  colPos: ScalePosition,
  level: 'aaa' | 'aa' | 'fail',
): string {
  if (level === 'aaa') {
    return `${rowPos} on ${colPos}: WCAG AAA pass`;
  }
  if (level === 'aa') {
    return `${rowPos} on ${colPos}: WCAG AA pass`;
  }
  return `${rowPos} on ${colPos}: WCAG fail`;
}

/**
 * Format a contrast summary label
 */
function summaryLabel(background: string, data: ContrastOnBackground): string {
  const parts = [`Contrast on ${background}: ${data.contrastRatio.toFixed(1)}:1`];
  if (data.wcagAA) parts.push('AA pass');
  else parts.push('AA fail');
  if (data.wcagAAA) parts.push('AAA pass');
  else parts.push('AAA fail');
  return parts.join(', ');
}

export function createContrastMatrix(
  container: HTMLElement,
  options: ContrastMatrixOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const { accessibility, scaleName } = options;
  const prevRole = container.getAttribute('role');
  const prevAriaLabel = container.getAttribute('aria-label');
  const createdElements: HTMLElement[] = [];

  const aaSet = accessibility.wcagAA
    ? buildPairSet(accessibility.wcagAA.normal)
    : new Set<string>();
  const aaaSet = accessibility.wcagAAA
    ? buildPairSet(accessibility.wcagAAA.normal)
    : new Set<string>();

  container.setAttribute('role', 'grid');
  container.setAttribute('aria-label', `${scaleName} contrast pairing matrix`);

  let focusRow = 0;
  let focusCol = 0;
  const cellElements: HTMLElement[][] = [];

  const headerRow = document.createElement('div');
  headerRow.setAttribute('role', 'row');
  createdElements.push(headerRow);

  const cornerCell = document.createElement('div');
  cornerCell.setAttribute('role', 'columnheader');
  cornerCell.textContent = '';
  headerRow.appendChild(cornerCell);

  for (const pos of SCALE_KEYS) {
    const header = document.createElement('div');
    header.setAttribute('role', 'columnheader');
    header.textContent = pos;
    headerRow.appendChild(header);
  }
  container.appendChild(headerRow);

  for (let i = 0; i < SCALE_KEYS.length; i++) {
    const rowPos = SCALE_KEYS[i];
    if (!rowPos) continue;

    const row = document.createElement('div');
    row.setAttribute('role', 'row');
    createdElements.push(row);

    // Row header
    const rowHeader = document.createElement('div');
    rowHeader.setAttribute('role', 'rowheader');
    rowHeader.textContent = rowPos;
    row.appendChild(rowHeader);

    const rowCells: HTMLElement[] = [];

    for (let j = 0; j < SCALE_KEYS.length; j++) {
      const colPos = SCALE_KEYS[j];
      if (!colPos) continue;

      const level = classifyCell(i, j, aaSet, aaaSet);
      const cell = document.createElement('div');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('data-wcag-level', level);
      cell.setAttribute('data-row', rowPos);
      cell.setAttribute('data-col', colPos);
      cell.setAttribute('aria-label', cellLabel(rowPos, colPos, level));
      cell.setAttribute('tabindex', i === 0 && j === 0 ? '0' : '-1');

      rowCells.push(cell);
      row.appendChild(cell);
    }

    cellElements.push(rowCells);
    container.appendChild(row);
  }

  const onWhiteSummary = document.createElement('div');
  onWhiteSummary.setAttribute('data-contrast-summary', 'on-white');
  onWhiteSummary.setAttribute('aria-label', summaryLabel('white', accessibility.onWhite));
  onWhiteSummary.textContent = summaryLabel('white', accessibility.onWhite);
  createdElements.push(onWhiteSummary);
  container.appendChild(onWhiteSummary);

  const onBlackSummary = document.createElement('div');
  onBlackSummary.setAttribute('data-contrast-summary', 'on-black');
  onBlackSummary.setAttribute('aria-label', summaryLabel('black', accessibility.onBlack));
  onBlackSummary.textContent = summaryLabel('black', accessibility.onBlack);
  createdElements.push(onBlackSummary);
  container.appendChild(onBlackSummary);

  if (accessibility.apca) {
    const apca = accessibility.apca;
    const apcaEl = document.createElement('div');
    apcaEl.setAttribute('data-apca', '');
    apcaEl.setAttribute(
      'aria-label',
      `APCA: on white ${apca.onWhite.toFixed(1)}, on black ${apca.onBlack.toFixed(1)}, min font size ${apca.minFontSize}px`,
    );
    apcaEl.textContent = `APCA: Lc ${apca.onWhite.toFixed(1)} (white), Lc ${apca.onBlack.toFixed(1)} (black), min ${apca.minFontSize}px`;
    createdElements.push(apcaEl);
    container.appendChild(apcaEl);
  }

  function moveFocus(newRow: number, newCol: number) {
    const prevCell = cellElements[focusRow]?.[focusCol];
    const nextCell = cellElements[newRow]?.[newCol];
    if (!prevCell || !nextCell) return;

    prevCell.setAttribute('tabindex', '-1');
    nextCell.setAttribute('tabindex', '0');
    nextCell.focus();
    focusRow = newRow;
    focusCol = newCol;
  }

  function handleKeydown(event: KeyboardEvent) {
    let newRow = focusRow;
    let newCol = focusCol;

    switch (event.key) {
      case 'ArrowRight':
        newCol = focusCol < SCALE_KEYS.length - 1 ? focusCol + 1 : 0;
        break;
      case 'ArrowLeft':
        newCol = focusCol > 0 ? focusCol - 1 : SCALE_KEYS.length - 1;
        break;
      case 'ArrowDown':
        newRow = focusRow < SCALE_KEYS.length - 1 ? focusRow + 1 : 0;
        break;
      case 'ArrowUp':
        newRow = focusRow > 0 ? focusRow - 1 : SCALE_KEYS.length - 1;
        break;
      case 'Home':
        newRow = 0;
        newCol = 0;
        break;
      case 'End':
        newRow = SCALE_KEYS.length - 1;
        newCol = SCALE_KEYS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    moveFocus(newRow, newCol);
  }

  container.addEventListener('keydown', handleKeydown);

  return () => {
    container.removeEventListener('keydown', handleKeydown);
    for (const el of createdElements) {
      el.remove();
    }
    restoreAttribute(container, 'role', prevRole);
    restoreAttribute(container, 'aria-label', prevAriaLabel);
  };
}

/**
 * Restore an attribute to its previous value, or remove it if it was absent
 */
function restoreAttribute(element: HTMLElement, name: string, previous: string | null): void {
  if (previous === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previous);
  }
}
