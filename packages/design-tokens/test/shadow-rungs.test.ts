import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateBaseSystem,
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  registryToTailwind,
  saveRegistryToDir,
  TokenRegistry,
} from '../src/index.js';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  scalePlugin,
  shadowRungPlugin,
  statePlugin,
} from '../src/plugins/index.js';

const PLUGINS = [
  scalePlugin,
  contrastPlugin,
  statePlugin,
  invertPlugin,
  mirrorPlugin,
  shadowRungPlugin,
];

// a part's resolved rem: follow var(--rafters-shadow-rung-<i>) to the rung token's literal
const resolvedRem = (reg: TokenRegistry, name: string): string => {
  const v = String(reg.get(name)?.value);
  const m = v.match(/^var\(--rafters-shadow-rung-(\d+)\)$/);
  return m ? String(reg.get(`shadow-rung-${m[1]}`)?.value) : v;
};

describe('shadow rungs', () => {
  it('keeps today at the default config', () => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
    expect(resolvedRem(reg, 'shadow-md-blur')).toBe('0.438rem');
    expect(registryToTailwind(reg)).toContain(
      '--rafters-shadow-md-blur: var(--rafters-shadow-rung-6);',
    );
    expect((registryToTailwind(reg).match(/--rafters-shadow-rung-\d+:/g) ?? []).length).toBe(21);
  });
  it('re-picks rungs when spacing-base changes', () => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
    reg.set('spacing-base', '0.3125rem', { reason: 'test' });
    const expected = new TokenRegistry(
      generateBaseSystem({ baseSpacingUnit: 5 }).allTokens,
      PLUGINS,
    );
    for (const name of ['shadow-md-blur', 'shadow-md-offset-y', 'shadow-lg-spread'])
      expect(resolvedRem(reg, name)).toBe(resolvedRem(expected, name));
    expect(resolvedRem(reg, 'shadow-md-blur')).toBe('0.563rem');
  });
  it('keeps an overridden part', () => {
    const tokens = generateBaseSystem().allTokens.map((t) =>
      t.name === 'shadow-md-blur'
        ? { ...t, value: '0.5rem', userOverride: { previousValue: t.value, reason: 'test' } }
        : t,
    ); // override shape as in test/cascade.test.ts
    const reg = new TokenRegistry(tokens, PLUGINS);
    reg.set('spacing-base', '0.3125rem', { reason: 'test' });
    expect(reg.get('shadow-md-blur')?.value).toBe('0.5rem');
  });
  it('moves only the parts on a changed rung', () => {
    const css = registryToTailwind(new TokenRegistry(generateBaseSystem().allTokens, PLUGINS));
    const onRung6 = [
      ...css.matchAll(/(--rafters-shadow-[a-z0-9-]+): var\(--rafters-shadow-rung-6\);/g),
    ].map((m) => m[1]);
    expect(onRung6).toContain('--rafters-shadow-md-blur');
    const changed = css.replace(
      /--rafters-shadow-rung-6: [^;]+;/,
      '--rafters-shadow-rung-6: 1rem;',
    );
    for (const part of onRung6) expect(changed).toContain(`${part}: var(--rafters-shadow-rung-6);`); // still linked, so it renders at 1rem
  });
  it('stays inside the scale at extreme bases', () => {
    for (const base of ['0.0625rem', '4rem']) {
      const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
      reg.set('spacing-base', base, { reason: 'test' });
      for (const t of [...reg.list()].filter((x) => x.binding?.plugin === 'shadow-rung')) {
        const i = Number(String(t.value).match(/rung-(\d+)/)?.[1]);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(21);
      }
    }
  });
});

// Today's shadow geometry at the default config, pinned from the generator
// before #2648: the rung literals and the rung each non-zero part sits on.
const TODAY_RUNGS = [
  '0.063rem',
  '0.125rem',
  '0.188rem',
  '0.25rem',
  '0.313rem',
  '0.375rem',
  '0.438rem',
  '0.563rem',
  '0.688rem',
  '0.813rem',
  '0.938rem',
  '1.125rem',
  '1.375rem',
  '1.688rem',
  '2rem',
  '2.375rem',
  '2.875rem',
  '3.438rem',
  '4.125rem',
  '4.938rem',
  '5.938rem',
];
const TODAY_PART_RUNGS: Record<string, number> = {
  'shadow-xs-offset-y': 0,
  'shadow-xs-blur': 1,
  'shadow-sm-offset-y': 0,
  'shadow-sm-blur': 3,
  'shadow-offset-y': 1,
  'shadow-blur': 5,
  'shadow-spread': 0,
  'shadow-md-offset-y': 3,
  'shadow-md-blur': 6,
  'shadow-md-spread': 0,
  'shadow-lg-offset-y': 6,
  'shadow-lg-blur': 10,
  'shadow-lg-spread': 0,
  'shadow-xl-offset-y': 11,
  'shadow-xl-blur': 12,
  'shadow-xl-spread': 0,
  'shadow-2xl-offset-y': 12,
  'shadow-2xl-blur': 16,
  'shadow-2xl-spread': 0,
};

describe('shadow rungs: every part', () => {
  it('references the spacing base from --shadow-base-unit', () => {
    const css = registryToTailwind(new TokenRegistry(generateBaseSystem().allTokens, PLUGINS));
    expect(css).toContain('--shadow-base-unit: var(--spacing-base);');
    expect(css).toContain('--spacing-base: 0.25rem;');
  });

  it('keeps every rung and every part at its value today', () => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
    const css = registryToTailwind(reg);
    for (const [i, rem] of TODAY_RUNGS.entries()) {
      expect(css).toContain(`--rafters-shadow-rung-${i}: ${rem};`);
    }
    const bound = [...reg.list()].filter((t) => t.binding?.plugin === 'shadow-rung');
    expect(bound.map((t) => t.name).sort()).toEqual(Object.keys(TODAY_PART_RUNGS).sort());
    for (const [name, rung] of Object.entries(TODAY_PART_RUNGS)) {
      expect(css).toContain(`--rafters-${name}: var(--rafters-shadow-rung-${rung});`);
      expect(resolvedRem(reg, name)).toBe(TODAY_RUNGS[rung]);
    }
    for (const name of [
      'shadow-xs-offset-x',
      'shadow-xs-spread',
      'shadow-sm-spread',
      'shadow-md-offset-x',
    ]) {
      expect(reg.get(name)?.value).toBe('0rem');
    }
  });

  it('re-picks every bound part as a fresh generation at the new base would', () => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
    reg.set('spacing-base', '0.3125rem', { reason: 'test' });
    const expected = new TokenRegistry(
      generateBaseSystem({ baseSpacingUnit: 5 }).allTokens,
      PLUGINS,
    );
    const bound = [...reg.list()].filter((t) => t.binding?.plugin === 'shadow-rung');
    expect(bound).toHaveLength(Object.keys(TODAY_PART_RUNGS).length);
    for (const t of bound) expect(resolvedRem(reg, t.name)).toBe(resolvedRem(expected, t.name));
  });
});

const TEST_TMP_ROOT = join(import.meta.dirname, '..', 'node_modules', '.test-tmp');

describe('shadow rungs: persistence and the shared plugin list', () => {
  it('exports one registry plugin list that carries shadowRungPlugin', () => {
    expect(REGISTRY_PLUGINS).toContain(shadowRungPlugin);
    expect(REGISTRY_PLUGINS.map((p) => p.name).sort()).toEqual(PLUGINS.map((p) => p.name).sort());
  });

  it('round-trips a shadow-rung binding through save and load', () => {
    mkdirSync(TEST_TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TEST_TMP_ROOT, 'shadow-rungs-'));
    try {
      const saved = new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
      saveRegistryToDir(dir, saved);
      const loaded = loadRegistryFromDir(dir, REGISTRY_PLUGINS);
      expect(loaded.get('shadow-md-blur')?.binding).toEqual(saved.get('shadow-md-blur')?.binding);
      expect(loaded.get('shadow-md-blur')?.binding?.plugin).toBe('shadow-rung');
      expect(loaded.get('shadow-md-blur')?.value).toBe('var(--rafters-shadow-rung-6)');
      // the loaded binding still cascades
      loaded.set('spacing-base', '0.3125rem', { reason: 'test' });
      expect(resolvedRem(loaded, 'shadow-md-blur')).toBe('0.563rem');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
