import { describe, expect, it } from 'vitest';
import {
  gridClasses,
  resolveColSpanClasses,
  resolveColumnsClasses,
} from '../../../src/components/grid/grid.classes';

describe('grid classes', () => {
  it('auto columns respond to ONE axis -- the container (double-axis defect not ported)', () => {
    const root = gridClasses({ columns: 'auto' }, {}).root;
    expect(root).toContain('@sm:grid-cols-2');
    expect(root).toContain('@lg:grid-cols-3');
    expect(root).not.toMatch(/(?<![@\w])sm:grid-cols/);
    expect(root).not.toMatch(/(?<![@\w])lg:grid-cols/);
  });

  it('fixed columns run the full 1-12 vocabulary', () => {
    for (const n of [1, 5, 11, 12] as const) {
      expect(gridClasses({ columns: n }, {}).root).toContain(`grid-cols-${n}`);
    }
  });

  it('responsive object emits base plus breakpoint classes', () => {
    expect(resolveColumnsClasses({ base: 2, md: 4 })).toBe('grid-cols-2 md:grid-cols-4');
  });

  it('stock layouts place by declared priority, never by source position', () => {
    const golden = gridClasses({ preset: 'golden' }, {}).root;
    expect(golden).toContain('[&>[data-priority=primary]]:col-span-2');
    expect(golden).not.toContain('first-child');

    const dashboard = gridClasses({ preset: 'bento', pattern: 'dashboard' }, {}).root;
    expect(dashboard).toContain('grid-cols-4');
    expect(dashboard).toContain('[&>[data-priority=primary]]:row-span-2');
    expect(dashboard).not.toContain('first-child');
  });

  // #2966 criterion-1: a span responds to width on the same axis as columns.
  it('a responsive span emits base plus breakpoint spans, like columns', () => {
    expect(resolveColSpanClasses({ base: 1, lg: 2 })).toBe('col-span-1 lg:col-span-2');
    expect(resolveColSpanClasses({ md: 3, '2xl': 12 })).toBe('md:col-span-3 2xl:col-span-12');
  });

  // #2966 criterion-2: a fixed span is unchanged.
  it('a fixed span spans the same tracks at every width', () => {
    expect(resolveColSpanClasses(2)).toBe('col-span-2');
    expect(resolveColSpanClasses(undefined)).toBe('');
  });

  // #2966 criterion-3: golden stacks below lg and is 2:1 from lg.
  it('golden stacks below lg and gives the primary child two of three tracks from lg', () => {
    const golden = gridClasses({ preset: 'golden' }, {}).root;
    expect(golden).toContain('grid-cols-1');
    expect(golden).toContain('lg:grid-cols-3');
    expect(golden).toContain('lg:[&>[data-priority=primary]]:col-span-2');
    expect(golden).not.toMatch(/(?<![\w:-])grid-cols-3/);
  });

  it('auto-scaling spacing applies only when gap and padding are both omitted', () => {
    expect(gridClasses({}, {}).root).toContain('@md:gap-4');
    const explicit = gridClasses({ gap: '6' }, {}).root;
    expect(explicit).toContain('gap-6');
    expect(explicit).not.toContain('@md:gap-4');
  });
});
