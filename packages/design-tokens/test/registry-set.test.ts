/**
 * One set on the token registry (#2845): it changes a token, creates a
 * fill-* fill or a colour family (#2855), and with no value undoes one step.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { oklchToCSS, SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import {
  generateBaseSystem,
  importColorFamily,
  loadRegistryFromDir,
  NameTakenError,
  REGISTRY_PLUGINS,
  saveRegistryToDir,
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

  it('accepts the text-clip part and names the field for an unknown clip value', () => {
    const registry = fresh();
    registry.set('fill-blaze', { ...GLASS, clip: 'text' }, { reason: 'gradient title' });
    expect(registry.get('fill-blaze')?.value).toEqual({ ...GLASS, clip: 'text' });
    expect(() =>
      registry.set('fill-blaze', { ...GLASS, clip: 'border' }, { reason: 'bad' }),
    ).toThrow(/value\.clip/);
    expect(registry.get('fill-blaze')?.value).toEqual({ ...GLASS, clip: 'text' });
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

const GOLD = '#c8a24b';
// The repo never writes to /tmp; this matches persistence.test.ts.
const TEST_TMP_ROOT = join(import.meta.dirname, '..', 'node_modules', '.test-tmp');
const STEPS = SCALE_POSITIONS.map((p) => `gold-${p}`);

function familyOf(registry: TokenRegistry, name: string): (Token | undefined)[] {
  return [name, ...SCALE_POSITIONS.map((p) => `${name}-${p}`)].map((n) => registry.get(n));
}

describe('set creates a colour family', () => {
  it('creates the family token and its eleven steps through importColorFamily', () => {
    const registry = fresh();
    registry.set('gold', GOLD, { reason: 'brand gold' });
    const seed = tryParseColor(GOLD);
    if (!seed) throw new Error('seed did not parse');
    const expected = importColorFamily('gold', '500', seed);
    expect(familyOf(registry, 'gold').map((t) => t?.value)).toEqual(expected.map((t) => t.value));
    expect(registry.get('gold')?.userOverride?.reason).toBe('brand gold');
    for (const step of STEPS) expect(registry.get(step)?.userOverride).toBeNull();
  });

  it('creates the same family from hex, rgb(), oklch() and an {l, c, h} object', () => {
    const seed = tryParseColor(GOLD);
    if (!seed) throw new Error('seed did not parse');
    const values = ['rgb(200 162 75)', oklchToCSS(seed), { l: seed.l, c: seed.c, h: seed.h }];
    const reference = fresh();
    reference.set('gold', GOLD, { reason: 'x' });
    for (const value of values) {
      const registry = fresh();
      registry.set('gold', value, { reason: 'x' });
      expect(familyOf(registry, 'gold').map((t) => t?.value)).toEqual(
        familyOf(reference, 'gold').map((t) => t?.value),
      );
    }
  });

  it('creates from a named colour', () => {
    const registry = fresh();
    registry.set('brick', 'firebrick', { reason: 'x' });
    expect(registry.has('brick-950')).toBe(true);
  });

  it('refuses a reserved prefix or a non-kebab name', () => {
    const registry = fresh();
    expect(() => registry.set('surface-gold', GOLD, { reason: 'x' })).toThrow(UnknownTokenError);
    expect(() => registry.set('Gold', GOLD, { reason: 'x' })).toThrow(UnknownTokenError);
    expect(registry.has('Gold-500')).toBe(false);
  });

  it('refuses with NameTakenError, naming the holder, when any occupied name exists', () => {
    const registry = fresh();
    registry.set('fill-gold', GLASS, { reason: 'x' });
    const size = registry.size();
    expect(() => registry.set('gold', GOLD, { reason: 'x' })).toThrow(NameTakenError);
    expect(() => registry.set('gold', GOLD, { reason: 'x' })).toThrow(/"fill-gold"/);
    expect(registry.size()).toBe(size);

    registry.define({
      name: 'teal-300',
      value: 'oklch(0.7 0.1 190)',
      category: 'color',
      namespace: 'color',
      userOverride: null,
    });
    expect(() => registry.set('teal', GOLD, { reason: 'x' })).toThrow(/"teal-300"/);
    expect(registry.has('teal')).toBe(false);
  });

  it('refuses a fill whose own name a token holds', () => {
    const registry = fresh();
    registry.define({
      name: 'glass',
      value: '1px',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: null,
    });
    expect(() => registry.set('fill-glass', GLASS, { reason: 'x' })).toThrow(NameTakenError);
    expect(registry.has('fill-glass')).toBe(false);
  });

  it('marks the family generateUtilityClass only with utilities: true', () => {
    const off = fresh();
    off.set('gold', GOLD, { reason: 'x' });
    expect(off.get('gold')?.generateUtilityClass).toBeUndefined();
    expect(css(off)).not.toContain('-gold-{');

    const on = fresh();
    on.set('gold', GOLD, { reason: 'x', utilities: true });
    expect(on.get('gold')?.generateUtilityClass).toBe(true);
    expect(css(on)).toContain('}-gold-{50,100');
  });

  it('removes the family and all eleven steps with set(name)', () => {
    const registry = fresh();
    const size = registry.size();
    registry.set('gold', GOLD, { reason: 'x' });
    registry.set('gold');
    expect(registry.size()).toBe(size);
    expect(familyOf(registry, 'gold').every((t) => t === undefined)).toBe(true);
  });

  it('survives save and load, and set(name) after reloading removes it', () => {
    mkdirSync(TEST_TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TEST_TMP_ROOT, 'rafters-2855-'));
    try {
      const registry = fresh();
      const size = registry.size();
      registry.set('gold', GOLD, { reason: 'x', utilities: true });
      saveRegistryToDir(dir, registry);
      const loaded = loadRegistryFromDir(dir, REGISTRY_PLUGINS);
      expect(familyOf(loaded, 'gold')).toEqual(familyOf(registry, 'gold'));
      loaded.set('gold');
      expect(loaded.size()).toBe(size);
      expect(loaded.has('gold-500')).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('set on a registered colour family with a new seed', () => {
  it('regenerates the family pinned at 500, dropping step overrides', () => {
    const registry = fresh();
    registry.set('zinc-300', 'oklch(0.5 0.2 30)', { reason: 'step edit' });
    registry.set('zinc', GOLD, { reason: 'warm zinc' });
    const seed = tryParseColor(GOLD);
    if (!seed) throw new Error('seed did not parse');
    expect(familyOf(registry, 'zinc').map((t) => t?.value)).toEqual(
      importColorFamily('zinc', '500', seed).map((t) => t.value),
    );
    expect(registry.get('zinc')?.userOverride?.reason).toBe('warm zinc');
    expect(registry.get('zinc-300')?.userOverride).toBeNull();
  });

  it('resolves a role pointed at the family to the new 500 after regeneration', () => {
    const registry = fresh();
    registry.set('gold', GOLD, { reason: 'x' });
    registry.set('primary', { family: 'gold', position: '500' }, { reason: 'brand' });
    registry.set('gold', 'oklch(0.55 0.15 250)', { reason: 'new seed' });
    const step = registry.get('gold-500')?.value;
    expect(step).toBe(oklchToCSS({ l: 0.55, c: 0.15, h: 250, alpha: 1 }));
    const out = css(registry);
    expect(out).toContain(`--color-gold-500: ${step};`);
    // The role reads its step through the role layer (#2745).
    expect(out).toContain('--rafters-primary-500: var(--color-gold-500);');
    expect(out).toContain('--rafters-primary: var(--rafters-primary-500);');
  });

  it('re-derives every token whose binding reads the family, directly or through a role', () => {
    const registry = fresh();
    const plugins = new Map(REGISTRY_PLUGINS.map((p) => [p.name, p]));
    const readsZinc = registry
      .list()
      .filter(
        (t) =>
          t.binding && plugins.get(t.binding.plugin)?.dependsOn(t.binding.input).includes('zinc'),
      );
    expect(readsZinc.length).toBeGreaterThan(0);
    const before = new Map(registry.list().map((t) => [t.name, t.value]));
    registry.set('zinc', GOLD, { reason: 'warm zinc' });
    // A registry built from the result derives every binding from scratch.
    const rebuilt = new TokenRegistry(registry.list(), REGISTRY_PLUGINS);
    const bound = registry.list().filter((t) => t.binding && !t.userOverride);
    for (const t of bound)
      expect(registry.get(t.name)?.value, t.name).toEqual(rebuilt.get(t.name)?.value);
    // The new seed moved at least one derived choice, so the check above is not vacuous.
    expect(bound.some((t) => !isDeepStrictEqual(before.get(t.name), t.value))).toBe(true);
  });

  it('keeps the family utilities across a regeneration', () => {
    const registry = fresh();
    registry.set('gold', GOLD, { reason: 'x', utilities: true });
    registry.set('gold', 'oklch(0.55 0.15 250)', { reason: 'new seed' });
    expect(registry.get('gold')?.generateUtilityClass).toBe(true);

    const plain = fresh();
    plain.set('gold', GOLD, { reason: 'x' });
    plain.set('gold', 'oklch(0.55 0.15 250)', { reason: 'new seed', utilities: true });
    expect(plain.get('gold')?.generateUtilityClass).toBe(true);
  });

  it('keeps set on a step an edit of that step', () => {
    const registry = fresh();
    const zinc = registry.get('zinc')?.value;
    registry.set('zinc-500', GOLD, { reason: 'x' });
    expect(registry.get('zinc-500')?.value).toBe(GOLD);
    expect(registry.get('zinc')?.value).toEqual(zinc);
  });

  it('deletes the family on set(name) right after a regeneration', () => {
    const registry = fresh();
    registry.set('zinc', GOLD, { reason: 'x' });
    registry.set('zinc');
    expect(familyOf(registry, 'zinc').every((t) => t === undefined)).toBe(true);
  });
});

describe('delete', () => {
  it('removes a fill, whoever made it', () => {
    const registry = fresh();
    registry.set('fill-glass', GLASS, { reason: 'designer' });
    expect(registry.delete('fill-glass', { reason: 'unused' })).toEqual(['fill-glass']);
    expect(registry.has('fill-glass')).toBe(false);
    expect(css(registry)).not.toContain('bg-fill-glass');
  });

  it('removes a colour family set created, with its eleven steps', () => {
    const registry = fresh();
    const size = registry.size();
    registry.set('gold', GOLD, { reason: 'brand' });
    expect(registry.delete('gold', { reason: 'unused' })).toEqual(['gold', ...STEPS]);
    expect(registry.size()).toBe(size);
    expect(familyOf(registry, 'gold').every((t) => t === undefined)).toBe(true);
  });

  it('removes a family that import wrote, which set(name) leaves alone', () => {
    const seed = tryParseColor(GOLD);
    if (!seed) throw new Error('seed did not parse');
    const imported = importColorFamily('imported-color-gold', '500', seed);
    const registry = new TokenRegistry(
      [...generateBaseSystem().allTokens, ...imported],
      REGISTRY_PLUGINS,
    );
    expect(registry.set('imported-color-gold')).toEqual([]);
    expect(registry.has('imported-color-gold')).toBe(true);
    const deleted = registry.delete('imported-color-gold', { reason: 'read by nothing' });
    expect(deleted).toEqual(imported.map((t) => t.name));
    expect(deleted.some((n) => registry.has(n))).toBe(false);
  });

  it('survives save and load', () => {
    mkdirSync(TEST_TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TEST_TMP_ROOT, 'rafters-2859-'));
    try {
      const registry = fresh();
      registry.set('gold', GOLD, { reason: 'brand' });
      saveRegistryToDir(dir, registry);
      const loaded = loadRegistryFromDir(dir, REGISTRY_PLUGINS);
      loaded.delete('gold', { reason: 'unused' });
      saveRegistryToDir(dir, loaded);
      const reloaded = loadRegistryFromDir(dir, REGISTRY_PLUGINS);
      expect(familyOf(reloaded, 'gold').every((t) => t === undefined)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses, changing nothing, with no reason, an unknown name, a step or a system token', () => {
    const registry = fresh();
    registry.set('gold', GOLD, { reason: 'brand' });
    const before = registry.list();
    const del = registry.delete.bind(registry) as (n: string, o?: unknown) => unknown;
    expect(() => del('gold')).toThrow(/cannot be deleted without a reason/);
    expect(() => del('gold', { reason: '' })).toThrow(/cannot be deleted without a reason/);
    expect(() => registry.delete('nothing-here', { reason: 'x' })).toThrow(UnknownTokenError);
    expect(() => registry.delete('gold-500', { reason: 'x' })).toThrow(
      /step of "gold"; delete "gold" instead/,
    );
    for (const name of ['spacing-base', 'font-sans', 'primary', 'surface-card']) {
      expect(registry.has(name)).toBe(true);
      expect(() => registry.delete(name, { reason: 'x' })).toThrow(/the system makes it/);
    }
    expect(registry.list()).toEqual(before);
  });
});

describe('set returns what it touched', () => {
  it('names the token, the created family, and nothing for an empty undo', () => {
    const registry = fresh();
    expect(registry.set('spacing-base', '0.3rem', { reason: 'x' })).toEqual(['spacing-base']);
    expect(registry.set('spacing-base')).toEqual(['spacing-base']);
    expect(registry.set('spacing-base')).toEqual([]);
    expect(registry.set('gold', GOLD, { reason: 'x' })).toEqual(['gold', ...STEPS]);
    expect(registry.set('gold')).toEqual(['gold', ...STEPS]);
  });
});
