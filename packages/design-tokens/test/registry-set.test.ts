/**
 * One set on the token registry (#2845): it changes a token, creates a
 * fill-* fill, and with no value undoes one step.
 */

import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import {
  generateBaseSystem,
  REGISTRY_PLUGINS,
  TokenRegistry,
  UnknownTokenError,
} from '../src/index.js';

const FG = { family: 'zinc', position: '900' };
const GLASS = { foreground: FG, background: { color: { family: 'zinc', position: '100' } } };

function fresh(): TokenRegistry {
  return new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
}

function css(registry: TokenRegistry): string {
  return tokensToTailwind([...registry.list()]);
}

describe('set on a registered token', () => {
  it('sets it, records the override and cascades', () => {
    const registry = fresh();
    const before = registry.get('spacing-base')?.value;
    const dependent = registry.get('shadow-md-blur');
    registry.set('spacing-base', '0.3125rem', { reason: 'tighter rhythm' });
    expect(registry.get('spacing-base')?.value).toBe('0.3125rem');
    expect(registry.get('spacing-base')?.userOverride).toMatchObject({
      previousValue: before,
      reason: 'tighter rhythm',
    });
    expect(registry.get('shadow-md-blur')?.value).not.toEqual(dependent?.value);
  });

  it('rejects a fill value that fails FillValueSchema without changing anything', () => {
    const registry = fresh();
    registry.set('fill-glass', GLASS, { reason: 'designer' });
    const before = registry.get('fill-glass');
    // A string passes TokenSchema's value union; only FillValueSchema refuses it.
    expect(() => registry.set('fill-glass', 'oklch(0 0 0)', { reason: 'bad' })).toThrow(
      /fill-glass/,
    );
    expect(registry.get('fill-glass')).toEqual(before);
  });

  it('names the field when a recipe holds a literal colour', () => {
    const registry = fresh();
    const literal = { ...GLASS, background: { color: 'oklch(0.6 0.1 240)' } };
    expect(() => registry.set('fill-glass', literal, { reason: 'bad' })).toThrow(
      /value\.background\.color/,
    );
    expect(() =>
      registry.define({ name: 'fill-glass', value: literal, category: 'fill', namespace: 'fill' }),
    ).toThrow(/value\.background\.color/);
    expect(registry.has('fill-glass')).toBe(false);
  });
});

describe('set on an unregistered name', () => {
  it('creates a fill-* fill that exports as bg-fill-<rest>', () => {
    const registry = fresh();
    registry.set('fill-glass', GLASS, { reason: 'designer' });
    const token = registry.get('fill-glass');
    expect(token).toMatchObject({ namespace: 'fill', value: GLASS });
    expect(css(registry)).toContain('@utility bg-fill-glass {');
    expect(css(registry)).not.toContain('bg-fill-fill-');
  });

  it('runs the fill name checks on the created fill', () => {
    const registry = fresh();
    expect(() => registry.set('fill-cover', GLASS, { reason: 'x' })).toThrow(/bg-cover/);
    expect(() => registry.set('fill-zinc', GLASS, { reason: 'x' })).toThrow(/colour "zinc"/);
    expect(() => registry.set('fill-Glass', GLASS, { reason: 'x' })).toThrow(/kebab-case/);
    expect(registry.has('fill-cover')).toBe(false);
  });

  it('refuses any other unregistered name', () => {
    const registry = fresh();
    expect(() => registry.set('spacing-huge', '9rem', { reason: 'x' })).toThrow(UnknownTokenError);
    expect(() => registry.set('glass', GLASS, { reason: 'x' })).toThrow(UnknownTokenError);
    expect(registry.has('spacing-huge')).toBe(false);
  });
});

describe('set without a reason', () => {
  it('is refused', () => {
    const registry = fresh();
    const before = registry.get('spacing-base');
    const set = registry.set.bind(registry) as (n: string, v: unknown, o?: unknown) => void;
    expect(() => set('spacing-base', '1rem')).toThrow(/reason/);
    expect(() => set('spacing-base', '1rem', { reason: '' })).toThrow(/reason/);
    expect(() => set('fill-glass', GLASS)).toThrow(/reason/);
    expect(registry.get('spacing-base')).toEqual(before);
    expect(registry.has('fill-glass')).toBe(false);
  });
});

describe('set with no value', () => {
  it('returns the token to its previousValue and clears the override, one step', () => {
    const registry = fresh();
    const generated = registry.get('spacing-base')?.value;
    registry.set('spacing-base', '0.3rem', { reason: 'first' });
    registry.set('spacing-base', '0.35rem', { reason: 'second' });
    registry.set('spacing-base');
    expect(registry.get('spacing-base')?.value).toBe('0.3rem');
    expect(registry.get('spacing-base')?.userOverride).toBeNull();
    registry.set('spacing-base');
    expect(registry.get('spacing-base')?.value).toBe('0.3rem');
    expect(generated).not.toBe('0.3rem');
  });

  it('cascades the restored value', () => {
    const registry = fresh();
    const dependent = registry.get('shadow-md-blur');
    registry.set('spacing-base', '0.3125rem', { reason: 'tighter' });
    expect(registry.get('shadow-md-blur')?.value).not.toEqual(dependent?.value);
    registry.set('spacing-base');
    expect(registry.get('shadow-md-blur')?.value).toEqual(dependent?.value);
  });

  it('does nothing to a token with no override', () => {
    const registry = fresh();
    const before = registry.get('spacing-base');
    registry.set('spacing-base');
    expect(registry.get('spacing-base')).toEqual(before);
  });

  it('removes a fill that set created', () => {
    const registry = fresh();
    registry.set('fill-glass', GLASS, { reason: 'designer' });
    expect(registry.get('fill-glass')?.userOverride?.previousValue).toEqual(GLASS);
    registry.set('fill-glass');
    expect(registry.has('fill-glass')).toBe(false);
    expect(registry.get('fill-glass')).toBeUndefined();
    expect(css(registry)).not.toContain('bg-fill-glass');
  });

  it('returns a changed fill to its recipe before the change', () => {
    const registry = fresh();
    registry.set('fill-glass', GLASS, { reason: 'designer' });
    const darker = { ...GLASS, foreground: { family: 'zinc', position: '950' } };
    registry.set('fill-glass', darker, { reason: 'darker' });
    registry.set('fill-glass');
    expect(registry.get('fill-glass')?.value).toEqual(GLASS);
    expect(registry.get('fill-glass')?.userOverride).toBeNull();
  });
});

describe('fill names', () => {
  const bare: Token = {
    name: 'glass',
    value: GLASS,
    category: 'fill',
    namespace: 'fill',
    userOverride: null,
  };

  it('rejects a fill named neither fill-* nor surface-* on define and on load, naming the rename', () => {
    expect(() => fresh().define(bare)).toThrow(/rename it to "fill-glass"/);
    expect(
      () => new TokenRegistry([...generateBaseSystem().allTokens, bare], REGISTRY_PLUGINS),
    ).toThrow(/rename it to "fill-glass"/);
  });

  it('exports a stored fill-<name> as bg-fill-<name> and leaves surface-* fills unchanged', () => {
    const registry = fresh();
    const surfacesBefore = registry.list({ namespace: 'fill' });
    expect(surfacesBefore.length).toBeGreaterThan(0);
    expect(surfacesBefore.every((t) => t.name.startsWith('surface-'))).toBe(true);
    const before = css(registry).match(/@utility bg-surface-[\w-]+ \{[^}]*\}/g);
    registry.define({ ...bare, name: 'fill-glass' });
    expect(css(registry)).toContain('@utility bg-fill-glass {');
    expect(css(registry).match(/@utility bg-surface-[\w-]+ \{[^}]*\}/g)).toEqual(before);
  });
});
