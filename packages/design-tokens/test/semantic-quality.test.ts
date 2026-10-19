/**
 * Semantic selection over the default system (#2668): states that differ
 * from their base, rings that stand out from the page, foregrounds that meet
 * 4.5:1 wherever a step can.
 */

import { calculateWCAGContrast } from '@rafters/color-utils';
import type { ColorReference, ColorValue, OKLCH, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { generateBaseSystem, TokenRegistry } from '../src/index.js';
import { REGISTRY_PLUGINS } from '../src/plugins/index.js';

const PLUGINS = REGISTRY_PLUGINS;
const POS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const isRef = (v: unknown): v is ColorReference =>
  typeof v === 'object' && v !== null && 'family' in v && 'position' in v;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function fresh(): TokenRegistry {
  return new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
}

function helpers(reg: TokenRegistry) {
  const ref = (n: string): ColorReference => {
    const v: unknown = reg.get(n)?.value;
    if (!isRef(v)) throw new Error(n);
    return v;
  };
  /** The palette a token resolves to, through role names. */
  const palette = (n: string): ColorValue => {
    let family = ref(n).family;
    for (let hop = 0; hop < 8; hop++) {
      const fam = reg.get(family);
      if (fam?.namespace === 'color') return fam.value as ColorValue;
      const next: unknown = fam?.value;
      if (!isRef(next)) break;
      family = next.family;
    }
    throw new Error(n);
  };
  const colour = (n: string): OKLCH => {
    const o = palette(n).scale[POS.indexOf(String(ref(n).position))];
    if (!o) throw new Error(n);
    return o;
  };
  const step = (n: string): string => `${palette(n).name}-${ref(n).position}`;
  return { ref, palette, colour, step };
}

function input(token: Token | undefined): Record<string, unknown> {
  const raw: unknown = token?.binding?.input;
  if (!isRecord(raw)) throw new Error(`${token?.name} has no binding input`);
  return raw;
}

it('picks visible states, rings and readable foregrounds', () => {
  const reg = fresh();
  const ref = (n: string): ColorReference => {
    const v: unknown = reg.get(n)?.value;
    if (!isRef(v)) throw new Error(n);
    return v;
  };
  // resolve a token to OKLCH through role names to its palette
  const colour = (n: string): OKLCH => {
    let r = ref(n);
    for (let hop = 0; hop < 8; hop++) {
      const fam = reg.get(r.family);
      if (fam?.namespace === 'color') {
        const o = (fam.value as ColorValue).scale[POS.indexOf(String(r.position))];
        if (!o) throw new Error(n);
        return o;
      }
      const next: unknown = fam?.value;
      if (!isRef(next)) break;
      r = { family: next.family, position: r.position };
    }
    throw new Error(n);
  };
  const semantic = [...reg.list()].filter((t) => t.namespace === 'semantic');
  for (const t of semantic) {
    const dark = t.name.endsWith('--dark'),
      base = t.name.replace(/--dark$/, ''),
      sfx = dark ? '--dark' : '';
    const m = base.match(/^(.*)-(hover|active)$/);
    if (m && reg.get(m[1] + sfx))
      expect(`${ref(t.name).family}-${ref(t.name).position}`).not.toBe(
        `${ref(m[1] + sfx).family}-${ref(m[1] + sfx).position}`,
      );
    if (base.endsWith('-ring'))
      expect(
        calculateWCAGContrast(colour(t.name), colour(`background${sfx}`)),
      ).toBeGreaterThanOrEqual(3);
    // foreground criterion: checked per token against the best ratio its own and the fallback family allow (see criteria)
  }
});

describe('semantic selection over the default system (#2668)', () => {
  it('no *-active token shares a step with its *-hover', () => {
    const reg = fresh();
    const { step } = helpers(reg);
    for (const t of reg.list({ namespace: 'semantic' })) {
      const m = t.name.match(/^(.*)-active(--dark)?$/);
      if (!m) continue;
      const hover = `${m[1]}-hover${m[2] ?? ''}`;
      if (!reg.get(hover)) continue;
      expect(step(t.name), t.name).not.toBe(step(hover));
    }
  });

  it('every contrast-bound foreground meets 4.5:1 wherever its own or the neutral family can', () => {
    const reg = fresh();
    const { palette, colour } = helpers(reg);
    const neutral = reg.get('zinc')?.value as ColorValue;
    const unreachable: string[] = [];
    let checked = 0;
    for (const t of reg.list({ namespace: 'semantic' })) {
      if (t.binding?.plugin !== 'contrast') continue;
      const against = String(input(t).against);
      const base = colour(against);
      const candidates = [...palette(against).scale, ...neutral.scale];
      const best = Math.max(...candidates.map((c) => calculateWCAGContrast(base, c)));
      const actual = calculateWCAGContrast(colour(t.name), base);
      checked++;
      if (best >= 4.5) {
        expect(actual, `${t.name} on ${against}`).toBeGreaterThanOrEqual(4.5);
      } else {
        unreachable.push(`${t.name} best ${best.toFixed(2)}`);
      }
    }
    expect(checked).toBeGreaterThan(0);
    // The default success hue at 600 has no step, in its family or the
    // neutral, that reaches 4.5:1 (best 4.31). Listed, not hidden.
    expect(unreachable).toEqual(['success-foreground best 4.31']);
  });

  it('the generator measures rings against the mode background and falls foregrounds back to neutral', () => {
    const reg = fresh();
    expect(input(reg.get('primary-ring'))).toEqual({
      from: 'primary',
      stateType: 'ring',
      surface: 'background',
    });
    expect(input(reg.get('primary-ring--dark'))).toEqual({
      from: 'primary--dark',
      stateType: 'ring',
      surface: 'background--dark',
    });
    expect(input(reg.get('primary-hover'))).toEqual({ from: 'primary', stateType: 'hover' });
    expect(input(reg.get('primary-foreground'))).toMatchObject({
      against: 'primary',
      fallback: 'neutral',
    });
    expect(input(reg.get('primary-foreground--dark'))).toMatchObject({
      against: 'primary--dark',
      fallback: 'neutral',
    });
  });
});

describe('semantic selection follows the designer (#2668)', () => {
  it("registry.set('primary') to another step changes primary-hover and primary-foreground", () => {
    const reg = fresh();
    const { step } = helpers(reg);
    const hover = step('primary-hover');
    const foreground = step('primary-foreground');
    reg.set('primary', { family: 'zinc', position: '200' }, { reason: 'test' });
    expect(step('primary-hover')).not.toBe(hover);
    expect(step('primary-foreground')).not.toBe(foreground);
  });

  it("registry.set('background') changes every ring still measured against background", () => {
    const reg = fresh();
    const { step, colour, palette } = helpers(reg);
    const rings = reg
      .list({ namespace: 'semantic' })
      .filter((t) => t.binding?.plugin === 'state' && input(t).surface === 'background')
      .map((t) => t.name);
    expect(rings.length).toBeGreaterThan(0);
    const before = new Map(rings.map((n) => [n, step(n)]));
    // A mid-dark tinted page: no ring's current step, nor its base, stands
    // out from it, so every ring must re-derive to move.
    reg.set('background', { family: 'silver-true-sky', position: '700' }, { reason: 'test' });
    const page = colour('background');
    for (const name of rings) {
      expect(step(name), name).not.toBe(before.get(name));
      const best = Math.max(...palette(name).scale.map((c) => calculateWCAGContrast(c, page)));
      const ratio = calculateWCAGContrast(colour(name), page);
      if (best >= 3) expect(ratio, name).toBeGreaterThanOrEqual(3);
      else expect(ratio, name).toBe(best);
    }
  });

  it('a ring rebound to another surface follows that surface, not background', () => {
    const reg = fresh();
    const { step, colour } = helpers(reg);
    reg.bind('primary-ring', 'state', { ...input(reg.get('primary-ring')), surface: 'card' });
    expect(calculateWCAGContrast(colour('primary-ring'), colour('card'))).toBeGreaterThanOrEqual(3);

    const before = step('primary-ring');
    reg.set('card', { family: 'neutral', position: '900' }, { reason: 'test' });
    expect(step('primary-ring')).not.toBe(before);
    expect(calculateWCAGContrast(colour('primary-ring'), colour('card'))).toBeGreaterThanOrEqual(3);

    const onCard = step('primary-ring');
    reg.set('background', { family: 'neutral', position: '900' }, { reason: 'test' });
    expect(step('primary-ring')).toBe(onCard);
  });

  it('a ring the designer sets keeps its step through a registry reload', () => {
    const reg = fresh();
    const { colour } = helpers(reg);
    const chosen = { family: 'neutral', position: '50' };
    reg.set('primary-ring', chosen, { reason: 'designer choice' });
    expect(calculateWCAGContrast(colour('primary-ring'), colour('background'))).toBeLessThan(3);

    const reloaded = new TokenRegistry([...reg.list()], PLUGINS);
    expect(reloaded.get('primary-ring')?.value).toEqual(chosen);
  });
});
