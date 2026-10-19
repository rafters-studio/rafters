import { describe, expect, it } from 'vitest';
import { generateBaseSystem, registryToTailwind, TokenRegistry } from '../src/index.js';
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
