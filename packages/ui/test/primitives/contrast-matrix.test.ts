import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type ContrastMatrixOptions,
  createContrastMatrix,
} from '../../src/primitives/contrast-matrix';

function makeAccessibility(): ContrastMatrixOptions['accessibility'] {
  return {
    onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5.2 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 12.1 },
    wcagAA: {
      normal: [
        [0, 6],
        [0, 7],
        [1, 7],
        [2, 8],
      ],
      large: [
        [0, 5],
        [0, 6],
        [1, 6],
        [2, 7],
      ],
    },
    wcagAAA: {
      normal: [
        [0, 8],
        [0, 9],
      ],
      large: [
        [0, 7],
        [0, 8],
      ],
    },
    apca: { onWhite: 62.3, onBlack: -89.1, minFontSize: 14 },
  };
}

describe('contrast-matrix primitive', () => {
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    cleanup?.();
    container.remove();
  });

  it('sets container role="grid" with aria-label', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    expect(container.getAttribute('role')).toBe('grid');
    expect(container.getAttribute('aria-label')).toContain('ocean-blue');
  });

  it('creates row and cell elements', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const rows = container.querySelectorAll('[role="row"]');
    expect(rows.length).toBeGreaterThan(0);
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('marks AA-passing cells with data-wcag-level="aa"', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const aaCells = container.querySelectorAll('[data-wcag-level="aa"]');
    expect(aaCells.length).toBeGreaterThan(0);
  });

  it('marks AAA-passing cells with data-wcag-level="aaa"', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const aaaCells = container.querySelectorAll('[data-wcag-level="aaa"]');
    expect(aaaCells.length).toBeGreaterThan(0);
  });

  it('sets aria-label on cells with contrast info', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const cell = container.querySelector('[data-wcag-level]') as HTMLElement;
    const label = cell?.getAttribute('aria-label') ?? '';
    expect(label).toContain('WCAG');
  });

  it('renders on-white and on-black summary', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const summaries = container.querySelectorAll('[data-contrast-summary]');
    expect(summaries.length).toBe(2);
  });

  it('renders APCA data when available', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    const apca = container.querySelector('[data-apca]');
    expect(apca).not.toBeNull();
  });

  it('cleanup removes all elements and restores container', () => {
    cleanup = createContrastMatrix(container, {
      accessibility: makeAccessibility(),
      scaleName: 'ocean-blue',
    });
    cleanup();
    expect(container.querySelectorAll('[role="row"]')).toHaveLength(0);
    expect(container.getAttribute('role')).toBeNull();
  });
});
