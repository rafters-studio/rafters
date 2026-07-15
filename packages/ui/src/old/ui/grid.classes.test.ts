import { describe, expect, it } from 'vitest';
import {
  columnsResolvesToAuto,
  gridColSpanClasses,
  gridColumnClasses,
  resolveColumnsClasses,
} from './grid.classes';

describe('gridColumnClasses', () => {
  it('covers 1-12 plus auto', () => {
    for (let i = 1; i <= 12; i++) {
      expect(gridColumnClasses[i]).toBe(`grid-cols-${i}`);
    }
    expect(gridColumnClasses.auto).toContain('grid-cols-1');
  });
});

describe('gridColSpanClasses', () => {
  it('covers 1-12', () => {
    for (let i = 1; i <= 12; i++) {
      expect(gridColSpanClasses[i]).toBe(`col-span-${i}`);
    }
  });
});

describe('resolveColumnsClasses', () => {
  it('returns empty string when columns is undefined', () => {
    expect(resolveColumnsClasses(undefined)).toBe('');
  });

  it('returns the matching class for a single numeric value', () => {
    expect(resolveColumnsClasses(4)).toBe('grid-cols-4');
    expect(resolveColumnsClasses(12)).toBe('grid-cols-12');
  });

  it('returns the auto fallback for the literal "auto"', () => {
    expect(resolveColumnsClasses('auto')).toContain('grid-cols-1');
  });

  it('combines base with breakpoint variants in order', () => {
    expect(resolveColumnsClasses({ base: 2, md: 4 })).toBe('grid-cols-2 md:grid-cols-4');
    expect(resolveColumnsClasses({ base: 1, sm: 2, lg: 3, xl: 4 })).toBe(
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    );
  });

  it('omits base when not provided and still emits breakpoints', () => {
    expect(resolveColumnsClasses({ md: 4 })).toBe('md:grid-cols-4');
  });

  it('handles the 2xl breakpoint', () => {
    expect(resolveColumnsClasses({ base: 2, '2xl': 6 })).toBe('grid-cols-2 2xl:grid-cols-6');
  });
});

describe('columnsResolvesToAuto', () => {
  it('returns true for undefined and the literal "auto"', () => {
    expect(columnsResolvesToAuto(undefined)).toBe(true);
    expect(columnsResolvesToAuto('auto')).toBe(true);
  });

  it('returns false for explicit numeric or responsive object values', () => {
    expect(columnsResolvesToAuto(4)).toBe(false);
    expect(columnsResolvesToAuto({ base: 2, md: 4 })).toBe(false);
  });
});
