import { describe, expect, it } from 'vitest';
import { computeGridLayout } from '../../src/lib/grid-layout';

function totalCells(layout: ReturnType<typeof computeGridLayout>): number {
  return layout.reduce((sum, item) => sum + item.colSpan * item.rowSpan, 0);
}

describe('computeGridLayout', () => {
  describe('edge cases', () => {
    it('returns empty array for 0 items', () => {
      expect(computeGridLayout({ columns: 3, itemCount: 0, priorities: [] })).toEqual([]);
    });

    it('throws for columns < 1', () => {
      expect(() => computeGridLayout({ columns: 0, itemCount: 3, priorities: [1, 2, 3] })).toThrow(
        'columns must be between 1 and 6',
      );
    });

    it('throws for columns > 6', () => {
      expect(() => computeGridLayout({ columns: 7, itemCount: 3, priorities: [1, 2, 3] })).toThrow(
        'columns must be between 1 and 6',
      );
    });

    it('throws for non-integer columns', () => {
      expect(() =>
        computeGridLayout({ columns: 2.5, itemCount: 3, priorities: [1, 2, 3] }),
      ).toThrow('columns must be between 1 and 6');
    });

    it('throws when priorities length does not match itemCount', () => {
      expect(() => computeGridLayout({ columns: 3, itemCount: 5, priorities: [1, 2] })).toThrow(
        'priorities length must match itemCount',
      );
    });
  });

  describe('small collections (< 6 items)', () => {
    it('returns all standard 1x1 for 4 items', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 4,
        priorities: [5, 4, 3, 2],
      });
      expect(result.every((r) => r.colSpan === 1 && r.rowSpan === 1)).toBe(true);
    });

    it('returns all standard 1x1 for 5 items', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 5,
        priorities: [5, 4, 3, 2, 1],
      });
      expect(result.every((r) => r.colSpan === 1 && r.rowSpan === 1)).toBe(true);
    });
  });

  describe('3-column layouts', () => {
    it('6 items: adds row, 1 tall + 2 wide + 3 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 6,
        priorities: [6, 5, 4, 3, 2, 1],
      });
      expect(totalCells(result)).toBe(9); // 3 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan === 2)).toHaveLength(2); // 2 wide
    });

    it('7 items: 1 tall + 1 wide + 5 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 7,
        priorities: [6, 5, 4, 3, 3, 2, 1],
      });
      expect(totalCells(result)).toBe(9); // 3 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan === 2)).toHaveLength(1); // 1 wide
    });

    it('8 items: 1 tall + 7 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 8,
        priorities: [5, 4, 4, 3, 3, 2, 2, 1],
      });
      expect(totalCells(result)).toBe(9); // 3 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan > 1)).toHaveLength(0); // no wide
    });

    it('9 items: adds row, 1 tall + 2 wide + 6 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 9,
        priorities: [6, 5, 4, 3, 3, 3, 2, 2, 1],
      });
      expect(totalCells(result)).toBe(12); // 4 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan === 2)).toHaveLength(2); // 2 wide
    });

    it('10 items: 1 tall + 1 wide + 8 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 10,
        priorities: [6, 5, 4, 3, 3, 3, 2, 2, 1, 1],
      });
      expect(totalCells(result)).toBe(12); // 4 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan === 2)).toHaveLength(1); // 1 wide
    });

    it('12 items: adds row, 1 tall + 2 wide + 9 standard', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 12,
        priorities: [6, 5, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1],
      });
      expect(totalCells(result)).toBe(15); // 5 rows * 3 cols
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result.filter((r) => r.colSpan === 2)).toHaveLength(2); // 2 wide
    });
  });

  describe('priority ordering', () => {
    it('assigns tall to highest priority regardless of position', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 7,
        priorities: [1, 2, 3, 10, 2, 1, 1],
      });
      expect(result[3]).toEqual({ colSpan: 1, rowSpan: 2 }); // index 3 has highest priority
    });

    it('assigns wide to second-highest priority', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 7,
        priorities: [1, 8, 3, 10, 2, 1, 1],
      });
      expect(result[3]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(result[1]).toEqual({ colSpan: 2, rowSpan: 1 }); // wide
    });
  });

  describe('wideThreshold', () => {
    it('skips wide assignment for items below threshold', () => {
      const result = computeGridLayout({
        columns: 3,
        itemCount: 6,
        priorities: [6, 2, 2, 1, 1, 1],
        wideThreshold: 5,
      });
      // 3 extras (added row), 1 used for tall. 2 remain but no items >= 5
      // Falls back to assigning wide to next highest regardless
      expect(result[0]).toEqual({ colSpan: 1, rowSpan: 2 }); // tall
      expect(totalCells(result)).toBe(9);
    });
  });

  describe('different column counts', () => {
    it('works with 2 columns', () => {
      const result = computeGridLayout({
        columns: 2,
        itemCount: 6,
        priorities: [6, 5, 4, 3, 2, 1],
      });
      const cells = totalCells(result);
      expect(cells % 2).toBe(0); // divisible by columns
      expect(result[0].rowSpan).toBe(2); // tall
    });

    it('works with 4 columns', () => {
      const result = computeGridLayout({
        columns: 4,
        itemCount: 8,
        priorities: [8, 7, 6, 5, 4, 3, 2, 1],
      });
      const cells = totalCells(result);
      expect(cells % 4).toBe(0); // divisible by columns
      expect(result[0].rowSpan).toBe(2); // tall
    });

    it('works with 1 column', () => {
      const result = computeGridLayout({
        columns: 1,
        itemCount: 6,
        priorities: [6, 5, 4, 3, 2, 1],
      });
      // With 1 column, tall adds 1 extra row. No room for wide (colSpan=2 > columns=1).
      // But the function still assigns it -- CSS grid-flow-dense handles overflow.
      expect(result[0].rowSpan).toBe(2);
    });
  });

  describe('zero empty cells invariant', () => {
    it.each([6, 7, 8, 9, 10, 11, 12, 15, 20, 50, 100])(
      'produces clean fill for %d items in 3 columns',
      (itemCount) => {
        const priorities = Array.from({ length: itemCount }, (_, i) => itemCount - i);
        const result = computeGridLayout({ columns: 3, itemCount, priorities });
        const cells = totalCells(result);
        expect(cells % 3).toBe(0); // fills complete rows
        expect(result).toHaveLength(itemCount);
      },
    );

    it.each([6, 7, 8, 9, 10, 11, 12, 16, 20])(
      'produces clean fill for %d items in 4 columns',
      (itemCount) => {
        const priorities = Array.from({ length: itemCount }, (_, i) => itemCount - i);
        const result = computeGridLayout({ columns: 4, itemCount, priorities });
        const cells = totalCells(result);
        expect(cells % 4).toBe(0);
        expect(result).toHaveLength(itemCount);
      },
    );
  });
});
