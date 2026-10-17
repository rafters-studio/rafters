/**
 * The browser test page loads no compiled Tailwind sheet, so layout can only be
 * measured against a stand-in for the structural rules the day class names.
 * The stand-in is derived from the real class string: a `display` utility in it
 * becomes the same `display` on the cell, so a day class that leaves table
 * layout (the #2637 regression) leaves it here too. `size-8` is 2rem square.
 */
const DISPLAY: Record<string, string> = {
  flex: 'flex',
  'inline-flex': 'inline-flex',
  grid: 'grid',
  'inline-grid': 'inline-grid',
  block: 'block',
  'inline-block': 'inline-block',
};

export function dayLayoutCss(dayClass: string): string {
  const display = dayClass
    .split(/\s+/)
    .map((token) => DISPLAY[token])
    .find((value): value is string => value !== undefined);
  return `
    table { border-collapse: collapse; }
    [data-part="day"] { width: 2rem; height: 2rem; ${display ? `display: ${display};` : ''} }
  `;
}

export interface WeekGeometry {
  tops: number[];
  lefts: number[];
  /** Computed `display` of each cell: a cell that left table layout is not `table-cell`. */
  displays: string[];
  /** offsetLeft of the weekday header over each column. */
  headerLefts: number[];
}

/**
 * Geometry of the first full week row (seven cells), plus the weekday headers.
 * Offsets alone can pass when inline-level cells happen to share an anonymous
 * cell, so the computed display and the header-column alignment are returned
 * too: those are what the stacked-days defect actually breaks.
 */
export function fullWeekGeometry(root: ParentNode): WeekGeometry {
  const row = Array.from(root.querySelectorAll('tr')).find(
    (candidate) => candidate.querySelectorAll('td[data-value]').length === 7,
  );
  if (!row) throw new Error('no full week row');
  const cells = Array.from(row.querySelectorAll<HTMLElement>('td[data-value]'));
  return {
    tops: cells.map((c) => c.offsetTop),
    lefts: cells.map((c) => c.offsetLeft),
    displays: cells.map((c) => getComputedStyle(c).display),
    headerLefts: Array.from(root.querySelectorAll<HTMLElement>('th')).map((h) => h.offsetLeft),
  };
}

/** The shared assertion body, as a list of failures (empty when the row is a grid row). */
export function weekRowProblems(g: WeekGeometry): string[] {
  const problems: string[] = [];
  if (new Set(g.tops).size !== 1) problems.push(`offsetTop differs: ${g.tops.join(',')}`);
  for (let i = 1; i < g.lefts.length; i += 1) {
    if (!((g.lefts[i] as number) > (g.lefts[i - 1] as number))) {
      problems.push(`offsetLeft not increasing: ${g.lefts.join(',')}`);
      break;
    }
  }
  if (g.displays.some((d) => d !== 'table-cell')) {
    problems.push(`cell display is not table-cell: ${g.displays.join(',')}`);
  }
  if (g.lefts.join() !== g.headerLefts.join()) {
    problems.push(`cells not under their headers: ${g.lefts.join()} vs ${g.headerLefts.join()}`);
  }
  return problems;
}
