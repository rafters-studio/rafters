import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_FLOW,
  DEFAULT_GRID_GAP,
  GRID_COLS_VALUES,
  gridStylesheet,
} from './grid.styles';

describe('gridStylesheet defaults', () => {
  it('uses cols=1, gap=4, flow=row when no options passed', () => {
    expect(DEFAULT_GRID_COLS).toBe(1);
    expect(DEFAULT_GRID_GAP).toBe(4);
    expect(DEFAULT_GRID_FLOW).toBe('row');
    const css = gridStylesheet();
    expect(css).toContain(':host {');
    expect(css).toContain('display: block;');
    expect(css).toContain('container-type: inline-size;');
    expect(css).toContain('display: grid');
    expect(css).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
    expect(css).toContain('gap: var(--spacing-4)');
    expect(css).toContain('grid-auto-flow: row');
  });
});

describe('gridStylesheet container queries', () => {
  it('emits @container (min-width: 30rem) only when cols >= 2', () => {
    expect(gridStylesheet({ cols: 1 })).not.toContain('@container (min-width: 30rem)');
    expect(gridStylesheet({ cols: 2 })).toContain('@container (min-width: 30rem)');
  });

  it('never emits viewport media queries', () => {
    for (const cols of GRID_COLS_VALUES) {
      const css = gridStylesheet({ cols });
      expect(css).not.toMatch(/@media\s*\(/);
    }
  });

  it('emits all step-up breakpoints for cols=12', () => {
    const css = gridStylesheet({ cols: 12 });
    expect(css).toContain('@container (min-width: 30rem)');
    expect(css).toContain('@container (min-width: 48rem)');
    expect(css).toContain('@container (min-width: 64rem)');
    expect(css).toContain('@container (min-width: 80rem)');
    expect(css).toContain('@container (min-width: 96rem)');
    expect(css).toContain('repeat(12, minmax(0, 1fr))');
  });

  it('keeps mobile-first base at 1 column even when target cols=6', () => {
    const css = gridStylesheet({ cols: 6 });
    const baseRuleMatch = css.match(/\.grid\s*\{[\s\S]*?\}/);
    expect(baseRuleMatch).not.toBeNull();
    expect(baseRuleMatch?.[0]).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
  });
});

describe('gridStylesheet gap token resolution', () => {
  it('renders gap via tokenVar(spacing-N)', () => {
    expect(gridStylesheet({ gap: 8 })).toContain('gap: var(--spacing-8)');
    expect(gridStylesheet({ gap: 0 })).toContain('gap: var(--spacing-0)');
    expect(gridStylesheet({ gap: 16 })).toContain('gap: var(--spacing-16)');
  });
});

describe('gridStylesheet unknown value fallback', () => {
  it('falls back to defaults for unknown cols/gap/flow without throwing', () => {
    const css = gridStylesheet({ cols: 7 as never, gap: 99 as never, flow: 'sideways' as never });
    expect(css).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
    expect(css).toContain('gap: var(--spacing-4)');
    expect(css).toContain('grid-auto-flow: row');
  });
});

describe('gridStylesheet flow', () => {
  it('renders col -> grid-auto-flow: column', () => {
    expect(gridStylesheet({ flow: 'col' })).toContain('grid-auto-flow: column');
  });

  it('renders dense -> grid-auto-flow: row dense', () => {
    expect(gridStylesheet({ flow: 'dense' })).toContain('grid-auto-flow: row dense');
  });
});

describe('gridStylesheet purity', () => {
  it('returns identical output for identical inputs', () => {
    const a = gridStylesheet({ cols: 4, gap: 6, flow: 'row' });
    const b = gridStylesheet({ cols: 4, gap: 6, flow: 'row' });
    expect(a).toBe(b);
  });
});
