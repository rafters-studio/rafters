/**
 * toDTCG conforms to the Design Tokens Format Module 2025.10 and its Color
 * Module (#2758): every input token is a valid DTCG token or a named record
 * in the root `$extensions.rafters.unrepresented`.
 */
import type { Token } from '@rafters/shared';
import { DTCGColorValueSchema } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { toDTCG } from '../../src/exporters/dtcg.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import { importColorFamily } from '../../src/importers/color.js';
import { REGISTRY_PLUGINS, TokenRegistry } from '../../src/index.js';

type Node = Record<string, unknown>;
const isObj = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);
const REF = /^\{([^{}]+)\}$/;
const refTarget = (v: unknown): string | undefined =>
  typeof v === 'string' ? REF.exec(v)?.[1] : undefined;
const isToken = (v: unknown): v is Node => isObj(v) && '$value' in v;

function nodeAt(root: Node, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split('.')) {
    if (!isObj(cur) || !(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Every token with its dot path. Does not descend into tokens (the structure test catches children). */
function tokensOf(node: Node, path: string[] = []): Array<{ path: string; token: Node }> {
  const found: Array<{ path: string; token: Node }> = [];
  for (const [k, v] of Object.entries(node)) {
    if ((k.startsWith('$') && k !== '$root') || !isObj(v)) continue;
    if (isToken(v)) found.push({ path: [...path, k].join('.'), token: v });
    else found.push(...tokensOf(v, [...path, k]));
  }
  return found;
}

/** Follows {a.b.c} chains to a literal token; throws on a missing target or a cycle. */
function resolve(root: Node, path: string, seen: string[] = []): Node {
  if (seen.includes(path)) throw new Error(`cycle: ${[...seen, path].join(' -> ')}`);
  const t = nodeAt(root, path);
  if (!isToken(t)) throw new Error(`missing: ${path}`);
  const next = refTarget(t.$value);
  return next ? resolve(root, next, [...seen, path]) : t;
}

/** Format §5.2.2: own $type, else the referenced token's type, else the nearest ancestor group's $type. */
function typeOf(root: Node, path: string, seen: string[] = []): string | undefined {
  const t = nodeAt(root, path);
  if (!isToken(t)) return undefined;
  if (typeof t.$type === 'string') return t.$type;
  const next = refTarget(t.$value);
  if (next && !seen.includes(next)) return typeOf(root, next, [...seen, path]);
  const segs = path.split('.');
  for (let i = segs.length - 1; i > 0; i--) {
    const g = nodeAt(root, segs.slice(0, i).join('.'));
    if (isObj(g) && typeof g.$type === 'string') return g.$type;
  }
  return isObj(root) && typeof root.$type === 'string' ? root.$type : undefined;
}

const FONT_WEIGHT_ALIASES = [
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
];
const unitVal = (v: unknown, units: string[]) =>
  isObj(v) && typeof v.value === 'number' && typeof v.unit === 'string' && units.includes(v.unit);

/** Shape of a literal value per Format §8/§9 and Color §4.1. A composite sub-value may be a reference of the matching type. */
function checkShape(root: Node, type: string, v: unknown): boolean {
  const sub = (t: string, x: unknown) => {
    const target = refTarget(x);
    return target ? typeOf(root, target) === t : checkShape(root, t, x);
  };
  switch (type) {
    case 'color': {
      const p = DTCGColorValueSchema.safeParse(v);
      if (!p.success) return false;
      if (p.data.colorSpace !== 'oklch') return true;
      const [l, , h] = p.data.components;
      return (l === 'none' || (l >= 0 && l <= 1)) && (h === 'none' || (h >= 0 && h < 360));
    }
    case 'dimension':
      return unitVal(v, ['px', 'rem']);
    case 'duration':
      return unitVal(v, ['ms', 's']);
    case 'number':
      return typeof v === 'number';
    case 'fontFamily':
      return typeof v === 'string' || (Array.isArray(v) && v.every((s) => typeof s === 'string'));
    case 'fontWeight':
      return (
        (typeof v === 'number' && v >= 1 && v <= 1000) ||
        (typeof v === 'string' && FONT_WEIGHT_ALIASES.includes(v))
      );
    case 'cubicBezier':
      return (
        Array.isArray(v) &&
        v.length === 4 &&
        v.every((n) => typeof n === 'number') &&
        v[0] >= 0 &&
        v[0] <= 1 &&
        v[2] >= 0 &&
        v[2] <= 1
      );
    case 'strokeStyle':
      return typeof v === 'string' || isObj(v);
    case 'shadow': {
      const layers = Array.isArray(v) ? v : [v];
      return (
        layers.length > 0 &&
        layers.every((s) => {
          if (refTarget(s)) return typeOf(root, refTarget(s) ?? '') === 'shadow';
          return (
            isObj(s) &&
            sub('color', s.color) &&
            sub('dimension', s.offsetX) &&
            sub('dimension', s.offsetY) &&
            sub('dimension', s.blur) &&
            sub('dimension', s.spread)
          );
        })
      );
    }
    case 'typography':
      return (
        isObj(v) &&
        sub('fontFamily', v.fontFamily) &&
        sub('dimension', v.fontSize) &&
        sub('fontWeight', v.fontWeight) &&
        sub('dimension', v.letterSpacing) &&
        sub('number', v.lineHeight)
      );
    case 'transition':
      return (
        isObj(v) &&
        sub('duration', v.duration) &&
        sub('duration', v.delay) &&
        sub('cubicBezier', v.timingFunction)
      );
    case 'border':
      return (
        isObj(v) &&
        sub('color', v.color) &&
        sub('dimension', v.width) &&
        sub('strokeStyle', v.style)
      );
    default:
      return false;
  }
}

const tokens = generateBaseSystem().allTokens;
const out = toDTCG(tokens) as Node;
const unrepresented = (out.$extensions as { rafters: { unrepresented: Node } }).rafters
  .unrepresented;
const pathOf = (name: string) => name.split('-').filter(Boolean).join('.');
const tokenFor = (name: string): Node | undefined => {
  const n = nodeAt(out, pathOf(name));
  if (isToken(n)) return n;
  return isObj(n) && isToken(n.$root) ? n.$root : undefined;
};

describe('toDTCG conforms to DTCG Format/Color 2025.10', () => {
  it('has no token that is also a group, and no invalid names', () => {
    for (const { path, token } of tokensOf(out)) {
      expect(
        Object.keys(token).filter((k) => !k.startsWith('$')),
        path,
      ).toEqual([]);
    }
    const walk = (o: Node): void => {
      for (const [k, v] of Object.entries(o)) {
        if (k.startsWith('$') && k !== '$root') continue;
        expect(k === '' || /[{}.]/.test(k), k).toBe(false);
        if (isObj(v)) walk(v);
      }
    };
    walk(out);
  });

  it('accounts for every input name exactly once', () => {
    const names = [...new Set(tokens.map((t) => t.name))];
    for (const name of names) {
      expect(Number(tokenFor(name) !== undefined) + Number(name in unrepresented), name).toBe(1);
    }
    const roleScale = tokensOf(out).filter(({ path }) =>
      /^(neutral|primary|secondary|accent|highlight|muted|success|warning|destructive|info)\.(50|[1-9]00|950)$/.test(
        path,
      ),
    ).length;
    expect(tokensOf(out).length - roleScale + Object.keys(unrepresented).length).toBe(names.length); // 868
    const bare = toDTCG(tokens, { includeExtensions: false }) as Node;
    expect(
      Object.keys((bare.$extensions as { rafters: { unrepresented: Node } }).rafters.unrepresented),
    ).toEqual(Object.keys(unrepresented));
  });

  it('resolves every reference, and every token is typed and well-shaped', () => {
    for (const { path, token } of tokensOf(out)) {
      expect(() => resolve(out, path), path).not.toThrow();
      const type = typeOf(out, path);
      expect(type, path).toBeDefined();
      if (!refTarget(token.$value))
        expect(checkShape(out, type ?? '', token.$value), path).toBe(true);
    }
  });

  it('points role and family references at family steps', () => {
    expect(tokenFor('card')?.$value).toBe('{neutral.50}');
    expect((nodeAt(out, 'neutral.50') as Node).$value).toBe('{zinc.50}');
    expect(tokenFor('primary')?.$value).toBe('{neutral.900}');
    expect(tokenFor('zinc')?.$value).toBe('{zinc.600}');
    expect(tokenFor('zinc-600')?.$value).toEqual({
      colorSpace: 'oklch',
      components: [0.442, 0, 0],
    });
  });

  it('types from the value, not the name', () => {
    expect(typeOf(out, 'focus.ring.color')).toBe('color');
    expect(resolve(out, 'rafters.extent.pop')).toMatchObject({ $value: 0.95 });
    expect(typeOf(out, 'rafters.extent.pop')).toBe('number');
    expect(tokenFor('font-weight-semibold')).toMatchObject({ $type: 'fontWeight', $value: 600 });
    expect(tokenFor('font-sans')?.$type).toBe('fontFamily');
    expect(Array.isArray(tokenFor('font-sans')?.$value)).toBe(true);
    expect(tokenFor('line-height-lg')).toMatchObject({ $type: 'number', $value: 1.5 });
    expect(tokenFor('spacing-2')).toMatchObject({
      $type: 'dimension',
      $value: { value: 0.5, unit: 'rem' },
      $extensions: { rafters: { css: 'calc(var(--rafters-spacing-base) * 2)' } },
    });
    expect((tokenFor('title-large')?.$value as Node).fontSize).toBe('{font.size.3xl}');
    for (const name of [
      'screen-sm',
      'breakpoint-motion-reduce',
      'motion-keyframe-fade-in',
      'shadow-none',
      'focus-high-contrast',
    ]) {
      expect(tokenFor(name), name).toBeUndefined();
      expect(unrepresented[name], name).toMatchObject({
        value: tokens.find((t) => t.name === name)?.value,
      });
    }
  });

  it('keeps rafters-ease-* as cubicBezier (#2746)', () => {
    expect(typeOf(out, 'rafters.ease.standard')).toBe('cubicBezier');
    expect(resolve(out, 'rafters.ease.standard').$value).toEqual([0.4, 0, 0.2, 1]);
    expect(resolve(out, 'rafters.ease.linear').$value).toEqual([0, 0, 1, 1]);
  });

  it('emits hex only on srgb-tier steps', () => {
    const vivid = toDTCG(
      importColorFamily('vivid', '600', { l: 0.65, c: 0.3, h: 145, alpha: 1 }),
    ) as Node;
    expect((nodeAt(vivid, 'vivid.600.$value') as Node).hex).toBeUndefined(); // 600 is tier 'out'
  });

  it('refuses an unresolvable reference, a cycle, and a conflicting duplicate', () => {
    const tok = (name: string, value: Token['value']): Token => ({
      name,
      value,
      category: 'color',
      namespace: 'semantic',
      userOverride: null,
    });
    expect(() => toDTCG([tok('x', { family: 'nope', position: '500' })])).toThrow(
      'toDTCG: token "x" references "{nope.500}", which is not in the export',
    );
    expect(() =>
      toDTCG([
        tok('a', { family: 'b', position: '500' }),
        tok('b', { family: 'a', position: '500' }),
      ]),
    ).toThrow(/^toDTCG: circular reference /);
    const dup = (v: string): Token => ({
      name: 'font-size-base',
      value: v,
      category: 'typography',
      namespace: 'typography',
      userOverride: null,
    });
    expect(() => toDTCG([dup('1rem'), dup('2rem')])).toThrow(
      'toDTCG: duplicate token name "font-size-base" with different values',
    );
    expect(tokensOf(toDTCG([dup('1rem'), dup('1rem')]) as Node)).toHaveLength(1);
  });
});

describe('toDTCG composites, records and role scale (#2758)', () => {
  const byType = (type: string) => tokensOf(out).filter(({ path }) => typeOf(out, path) === type);
  const namesFrom = (prefix: string) =>
    tokens.filter((t) => t.name.startsWith(prefix)).map((t) => t.name);

  it('emits the composites the Behavior table names', () => {
    expect(byType('typography').filter(({ token }) => !refTarget(token.$value))).toHaveLength(14);
    expect(byType('border')).toHaveLength(5);
    expect(byType('transition')).toHaveLength(13);
    expect(
      byType('shadow')
        .map(({ path }) => path)
        .sort(),
    ).toEqual(
      [
        'shadow.$root',
        'shadow.xs.$root',
        'shadow.sm.$root',
        'shadow.md.$root',
        'shadow.lg.$root',
        'shadow.xl.$root',
        'shadow.2xl.$root',
        'shadow.primary',
        'shadow.destructive',
      ].sort(),
    );
    expect((tokenFor('shadow-primary')?.$value as Node[] | undefined)?.[0]?.color).toEqual({
      ...(resolve(out, 'primary.$root').$value as Node),
      alpha: 0.12,
    });
    expect(tokenFor('focus-ring')).toMatchObject({
      $value: { color: '{ring.$root}', width: '{focus.ring.width}', style: 'solid' },
      $extensions: { rafters: { offset: 'var(--rafters-focus-ring-width)' } },
    });
    expect(tokenFor('motion-semantic-sheet-in')?.$value).toEqual({
      duration: '{rafters.duration.normal}',
      delay: { value: 0, unit: 'ms' },
      timingFunction: '{rafters.ease.spring.smooth}',
    });
  });

  it('records every unrepresentable class verbatim, motion cells included', () => {
    const names = [
      ...namesFrom('screen-'),
      'breakpoint-motion-reduce',
      'breakpoint-dark',
      'breakpoint-high-contrast',
      'breakpoint-forced-colors',
      ...namesFrom('motion-keyframe-'),
      ...namesFrom('motion-animation-'),
      ...namesFrom('motion-cell-'),
      'spacing-progression',
      'typography-progression',
      'breakpoint-scale',
      'shadow-progression',
      'depth-scale',
      'motion-progression',
      'shadow-none',
      'focus-high-contrast',
    ];
    expect(namesFrom('motion-cell-')).toHaveLength(51);
    for (const name of names) {
      const input = tokens.find((t) => t.name === name);
      expect(tokenFor(name), name).toBeUndefined();
      expect(unrepresented[name], name).toEqual({
        value: input?.value,
        category: input?.category,
        reason: expect.any(String),
      });
    }
  });

  it('makes a token that would reference an unrepresented token unrepresented, naming it', () => {
    const tok = (name: string, value: string): Token => ({
      name,
      value,
      category: 'shadow',
      namespace: 'shadow',
      userOverride: null,
    });
    const result = toDTCG([
      tok('shadow-none', 'none'),
      tok('card-shadow', 'var(--rafters-shadow-none)'),
    ]) as Node;
    const record = (
      result.$extensions as { rafters: { unrepresented: Record<string, { reason: string }> } }
    ).rafters.unrepresented;
    expect(Object.keys(record).sort()).toEqual(['card-shadow', 'shadow-none']);
    expect(record['card-shadow']?.reason).toContain('"shadow-none"');
  });

  it('records a name with an object-prototype segment as unrepresented and leaves Object.prototype alone', () => {
    const tok = (name: string): Token => ({
      name,
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: null,
    });
    const result = toDTCG([
      tok('__proto__-polluted'),
      tok('spacing-constructor'),
      tok('__proto__'),
    ]) as Node;
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const record = (
      result.$extensions as { rafters: { unrepresented: Record<string, { reason: string }> } }
    ).rafters.unrepresented;
    expect(Object.keys(record).sort()).toEqual([
      '__proto__',
      '__proto__-polluted',
      'spacing-constructor',
    ]);
    expect(record['spacing-constructor']?.reason).toContain('"constructor"');
  });

  it('checks hex against a step stored at tier out', () => {
    const family = importColorFamily('vivid', '600', { l: 0.65, c: 0.3, h: 145, alpha: 1 })[0]
      ?.value;
    expect(isObj(family) && Array.isArray(family.gamut) ? family.gamut[6] : undefined).toBe('out');
  });

  it('moving neutral to another family changes only the role scale', () => {
    const registry = new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
    const before = toDTCG([...registry.list()]) as Node;
    registry.set('neutral', { family: 'silver-true-sky', position: '500' }, { reason: 'test' });
    const moved = toDTCG([...registry.list()]) as Node;
    const at = (root: Node, path: string) => (nodeAt(root, path) as Node).$value;
    expect(at(moved, 'card.$root')).toBe('{neutral.50}');
    expect(at(moved, 'primary.$root')).toBe('{neutral.900}');
    expect(at(moved, 'neutral.50')).toBe('{silver.true.sky.50}');
    for (const { path } of tokensOf(moved)) expect(() => resolve(moved, path), path).not.toThrow();
    // The registry re-picks some dependents' steps for the new palette, but
    // no reference leaves its role: only neutral's own value names the palette.
    const familyOf = (v: unknown) => refTarget(v)?.replace(/\.[^.]+$/, '');
    const leftRole = tokensOf(moved)
      .filter(({ path }) => !/^[a-z]+\.(50|[1-9]00|950)$/.test(path))
      .filter(({ path, token }) => familyOf(token.$value) !== familyOf(at(before, path)))
      .map(({ path }) => path);
    // info-foreground falls back to the neutral role (4.49:1, tracked in rafters #2811).
    expect(leftRole).toEqual(['neutral.$root', 'neutral.dark', 'info.foreground.$root']);
  });
});
