import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as classyModule from '../../src/primitives/classy';
import {
  FILL_SHAPE,
  resolveFill,
  resolveSurface,
  SURFACE_CLASSES,
} from '../../src/primitives/surface';

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('resolveFill - the bg-fill- shape guard (FR-RAF-FILL-003)', () => {
  const surface = 'bg-card text-card-foreground';

  it('a single bg-fill- token wins over the surface, unchanged and silent', () => {
    expect(resolveFill('bg-fill-glass', surface)).toBe('bg-fill-glass');
    expect(warn).not.toHaveBeenCalled();
  });

  it('no fill leaves the surface standing, silently', () => {
    expect(resolveFill(undefined, surface)).toBe(surface);
    expect(resolveFill('', surface)).toBe(surface);
    expect(resolveFill(undefined)).toBe('');
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
    expect(resolveFill(value, surface)).toBe(surface);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(`'${value}'`);
  });

  it('FILL_SHAPE keeps the value veneer runs', () => {
    expect(FILL_SHAPE.source).toBe('^bg-fill-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$');
    expect(FILL_SHAPE.flags).toBe('');
  });
});

describe('resolveSurface - the surface prop (FR-RAF-FILL-004)', () => {
  const base = 'bg-popover text-popover-foreground';

  it('a surface name picks its literal bg-surface- class over the base', () => {
    expect(resolveSurface('card', base)).toBe('bg-surface-card');
    expect(resolveSurface('primary-subtle', base)).toBe('bg-surface-primary-subtle');
  });

  it.each([undefined, '', 'nope', 'bg-surface-card', 'toString', 42])(
    'leaves the base standing for %s, with no warning',
    (name) => {
      expect(resolveSurface(name, base)).toBe(base);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('every class is the literal bg-surface- class of its name', () => {
    for (const [name, cls] of Object.entries(SURFACE_CLASSES)) {
      expect(cls).toBe(`bg-surface-${name}`);
    }
  });

  it('a fill still wins over a surface', () => {
    expect(resolveFill('bg-fill-glass', resolveSurface('card', base))).toBe('bg-fill-glass');
  });
});

describe('the move out of classy', () => {
  it('surface.ts imports nothing', () => {
    const source = readFileSync(join(process.cwd(), 'src/primitives/surface.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*(?:import\b|export\b.*\bfrom\b)/m);
    expect(source).not.toMatch(/\b(?:import|require)\s*\(/);
  });

  it('classy has no fill or surface method and exports no SURFACE_CLASSES', () => {
    expect(classyModule.classy).not.toHaveProperty('fill');
    expect(classyModule.classy).not.toHaveProperty('surface');
    expect(classyModule).not.toHaveProperty('SURFACE_CLASSES');
  });
});
