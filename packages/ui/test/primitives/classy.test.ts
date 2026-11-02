import { describe, expect, it, vi } from 'vitest';
import {
  createClassy,
  classy as defaultClassy,
  SURFACE_CLASSES,
  token,
} from '../../src/primitives/classy';

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

describe('classy - bracket classes', () => {
  it('keeps bracket classes and does not warn', () => {
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    const out = c('a', 'w-[10px]', { b: true }, 'hover:grid-rows-[minmax(0,0fr)]');
    expect(out).toBe('a w-[10px] b hover:grid-rows-[minmax(0,0fr)]');
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps bracket classes in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    expect(c('a', 'w-[10px]')).toBe('a w-[10px]');
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('dedups bracket classes like any other class', () => {
    const c = createClassy();
    expect(c('a', 'w-[10px]', 'a', 'w-[10px]')).toBe('a w-[10px]');
  });

  it('keeps bracket classes that a token resolves to', () => {
    const c = createClassy({ tokenMap: () => 'w-[10px]' });
    expect(c(token('k'))).toBe('w-[10px]');
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

describe('classy - named grid track utility', () => {
  it('keeps grid-cols-menu-row without a warning', () => {
    const spy = vi.fn();
    const c = createClassy({ warn: spy });
    expect(c('grid grid-cols-menu-row')).toBe('grid grid-cols-menu-row');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('classy.fill - the bg-fill- shape guard (FR-RAF-FILL-003)', () => {
  const surface = 'bg-card text-card-foreground';

  it('a single bg-fill- token wins over the surface, unchanged and silent', () => {
    const warn = vi.fn();
    expect(createClassy({ warn }).fill('bg-fill-glass', surface)).toBe('bg-fill-glass');
    expect(warn).not.toHaveBeenCalled();
  });

  it('no fill leaves the surface standing, silently', () => {
    const warn = vi.fn();
    const c = createClassy({ warn });
    expect(c.fill(undefined, surface)).toBe(surface);
    expect(c.fill('', surface)).toBe(surface);
    expect(c.fill(undefined)).toBe('');
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    'bg-red-500',
    'bg-fill-glass extra',
    'background',
    'muted/50',
    'bg-fill-',
    'bg-fill-[x]',
  ])('drops %s with a warning naming it, and the surface stands', (value) => {
    const warn = vi.fn();
    expect(createClassy({ warn }).fill(value, surface)).toBe(surface);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(`'${value}'`);
  });
});

describe('classy.surface - the surface prop (FR-RAF-FILL-004)', () => {
  const base = 'bg-popover text-popover-foreground';

  it('a surface name picks its literal bg-surface- class over the base', () => {
    expect(createClassy().surface('card', base)).toBe('bg-surface-card');
    expect(createClassy().surface('primary-subtle', base)).toBe('bg-surface-primary-subtle');
  });

  it.each([undefined, '', 'nope', 'bg-surface-card', 'toString', 42])(
    'leaves the base standing for %s',
    (name) => {
      expect(createClassy().surface(name, base)).toBe(base);
    },
  );

  it('every class is the literal bg-surface- class of its name', () => {
    for (const [name, cls] of Object.entries(SURFACE_CLASSES)) {
      expect(cls).toBe(`bg-surface-${name}`);
    }
  });

  it('a fill still wins over a surface', () => {
    const c = createClassy();
    expect(c.fill('bg-fill-glass', c.surface('card', base))).toBe('bg-fill-glass');
  });
});
