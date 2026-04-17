import { describe, expect, it, vi } from 'vitest';
import { createClassy, classy as defaultClassy, token } from '../../src/primitives/classy';

describe('classy - basic merging', () => {
  it('merges strings, arrays and objects', () => {
    const c = defaultClassy;
    const out = c('btn', ['px-4', { hidden: false }], { active: true });
    expect(out).toBe('btn px-4 active');
  });

  it('deduplicates preserving order', () => {
    const c = defaultClassy;
    const out = c('a b', 'b c', ['a', 'd']);
    expect(out).toBe('a b c d');
  });
});

describe('classy - token resolution', () => {
  it('resolves token refs via tokenMap', () => {
    const tokenMap = (k: string) => {
      if (k === 'spacing.4') return 'p-4';
      if (k === 'color.surface') return 'bg-surface';
      return null;
    };

    const c = createClassy({ tokenMap });
    const out = c('btn', token('spacing.4'), { 'is-open': true }, token('color.surface'));
    expect(out).toBe('btn p-4 is-open bg-surface');
  });

  it('warns on unknown token', () => {
    const spy = vi.fn();
    const c = createClassy({ tokenMap: (_k) => null, warn: spy });
    const out = c(token('unknown.token'), 'ok');
    expect(out).toBe('ok');
    expect(spy).toHaveBeenCalled();
  });
});

describe('classy - bracket blocking', () => {
  it('skips bracket classes by default and warns', () => {
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    const out = c('a', 'w-[10px]', { b: true });
    expect(out).toBe('a b');
    expect(spy).toHaveBeenCalled();
  });

  it('allows bracket classes when configured', () => {
    const c = createClassy({ allowArbitrary: true });
    const out = c('a', 'w-[10px]', 'a');
    expect(out).toBe('a w-[10px]');
  });
});

describe('classy - layout utilities pass through', () => {
  it('passes layout utilities through silently', () => {
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    const out = c('flex', 'gap-4', 'p-4', 'bg-primary');
    expect(out).toBe('flex gap-4 p-4 bg-primary');
    expect(spy).not.toHaveBeenCalled();
  });
});
