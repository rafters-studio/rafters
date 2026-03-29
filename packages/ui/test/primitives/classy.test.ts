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

describe('classy - layout utility detection', () => {
  it('warns on layout utilities in consumer code but keeps them', () => {
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    const out = c('flex', 'gap-4', 'bg-primary');
    // Consumer: warns but allows
    expect(out).toBe('flex gap-4 bg-primary');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toContain('layout utility');
    expect(spy.mock.calls[1][0]).toContain('layout utility');
  });

  it('strips layout utilities in component context', () => {
    const spy = vi.fn();
    const c = createClassy({ component: true, warn: spy });
    const out = c('flex', 'gap-4', 'bg-primary');
    // Component: strips layout, keeps color
    expect(out).toBe('bg-primary');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toContain('stripped');
  });

  it('detects all layout utility patterns', () => {
    const spy = vi.fn();
    const c = createClassy({ component: true, warn: spy });
    const out = c(
      'flex',
      'flex-col',
      'inline-flex',
      'grid',
      'grid-cols-3',
      'gap-4',
      'space-x-2',
      'p-4',
      'px-6',
      'py-2',
      'm-4',
      'mx-auto',
      'my-8',
      'items-center',
      'justify-between',
      'self-start',
      'bg-primary',
      'text-sm',
      'border',
    );
    // Only non-layout classes survive
    expect(out).toBe('bg-primary text-sm border');
  });

  it('handles modifiers on layout utilities', () => {
    const spy = vi.fn();
    const c = createClassy({ component: true, warn: spy });
    const out = c('hover:flex', 'md:gap-4', 'bg-primary');
    // Modifiers on layout utilities are still layout
    expect(out).toBe('bg-primary');
  });

  it('allows semantic color classes on components', () => {
    const spy = vi.fn();
    const c = createClassy({ component: true, warn: spy });
    const out = c('bg-primary', 'text-destructive', 'border-success');
    expect(out).toBe('bg-primary text-destructive border-success');
    expect(spy).not.toHaveBeenCalled();
  });

  it('default classy warns but does not strip', () => {
    const spy = vi.fn();
    // Temporarily redirect warn to spy
    const c = createClassy({ warn: spy });
    const out = c('flex', 'p-4', 'bg-card');
    expect(out).toContain('flex');
    expect(out).toContain('p-4');
    expect(out).toContain('bg-card');
    expect(spy).toHaveBeenCalled();
  });
});
