/**
 * toDTCG writes one DTCG 2025.10 file per mode in the form Figma's Variables
 * panel imports (#2891): every `$value` is a type and unit Figma accepts, the
 * mode files share paths and types, composites split into single values, and
 * every source token rides whole in `$extensions.rafters` or the root
 * `$extensions.rafters.unrepresented` record.
 */
import { hexToOKLCH } from '@rafters/color-utils';
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

function nodeAt(root: unknown, path: string): unknown {
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

/** Every source token a file carries: on tokens, on split composites' groups, and in the root record. */
function carriedTokens(file: Node): Token[] {
  const found: Token[] = [];
  const walk = (node: Node, isRoot: boolean): void => {
    const own = nodeAt(node, '$extensions.rafters.token');
    if (isObj(own)) found.push(own as unknown as Token);
    if (isRoot) {
      const record = nodeAt(node, '$extensions.rafters.unrepresented');
      for (const entry of Object.values(isObj(record) ? record : {})) {
        if (isObj(entry) && isObj(entry.token)) found.push(entry.token as unknown as Token);
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if ((k.startsWith('$') && k !== '$root') || !isObj(v)) continue;
      walk(v, false);
    }
  };
  walk(file, true);
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

const unitVal = (v: unknown, units: string[]) =>
  isObj(v) && typeof v.value === 'number' && typeof v.unit === 'string' && units.includes(v.unit);

/** A literal in a type and unit Figma's import accepts. */
function figmaShape(type: unknown, v: unknown): boolean {
  switch (type) {
    case 'color': {
      const p = DTCGColorValueSchema.safeParse(v);
      return (
        p.success &&
        p.data.colorSpace === 'srgb' &&
        p.data.components.length === 3 &&
        p.data.components.every((n) => typeof n === 'number' && n >= 0 && n <= 1) &&
        typeof p.data.alpha === 'number' &&
        typeof p.data.hex === 'string'
      );
    }
    case 'dimension':
      return unitVal(v, ['px']);
    case 'duration':
      return unitVal(v, ['s']);
    case 'number':
      return typeof v === 'number';
    case 'fontFamily':
    case 'string':
      return typeof v === 'string';
    default:
      return false;
  }
}

const tokens = generateBaseSystem().allTokens;
const { light, dark, unrepresented: report, gamutMapped } = toDTCG(tokens);
const out = light as Node;
const darkOut = dark as Node;
const unrepresented = nodeAt(out, '$extensions.rafters.unrepresented') as Node;
const pathOf = (name: string) => name.split('-').filter(Boolean).join('.');
const tokenFor = (root: Node, name: string): Node | undefined => {
  const n = nodeAt(root, pathOf(name));
  if (isToken(n)) return n;
  return isObj(n) && isToken(n.$root) ? n.$root : undefined;
};

describe('toDTCG writes the subset Figma imports', () => {
  it('has no token that is also a group, and no invalid names', () => {
    for (const root of [out, darkOut]) {
      for (const { path, token } of tokensOf(root)) {
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
      walk(root);
    }
  });

  it('writes every $value in a type and unit Figma accepts, and resolves every alias', () => {
    for (const root of [out, darkOut]) {
      for (const { path, token } of tokensOf(root)) {
        expect(() => resolve(root, path), path).not.toThrow();
        const literal = resolve(root, path);
        expect(literal.$type, path).toBe(token.$type);
        expect(figmaShape(token.$type, literal.$value), path).toBe(true);
      }
    }
  });

  it('gives both mode files the same paths with the same types', () => {
    const typesOf = (root: Node) =>
      Object.fromEntries(tokensOf(root).map(({ path, token }) => [path, token.$type]));
    expect(typesOf(darkOut)).toEqual(typesOf(out));
    expect(tokensOf(out).some(({ path }) => /\.dark(\.|$)/.test(path))).toBe(false);
  });

  it("gives the dark file each token's --dark value", () => {
    expect(tokenFor(out, 'card')?.$value).toBe('{neutral.50}');
    expect(tokenFor(darkOut, 'card')?.$value).toBe('{neutral.700}');
    expect(nodeAt(tokenFor(darkOut, 'card'), '$extensions.rafters.token.name')).toBe('card--dark');
  });

  it('keeps semantic tokens as aliases of their primitives', () => {
    expect(tokenFor(out, 'card')?.$value).toBe('{neutral.50}');
    expect((nodeAt(out, 'neutral.50') as Node).$value).toBe('{zinc.50}');
    expect(tokenFor(out, 'primary')?.$value).toBe('{neutral.900}');
    expect(tokenFor(out, 'zinc')?.$value).toBe('{zinc.600}');
  });

  it('writes colours as sRGB with hex, keeping the OKLCH value in $extensions.rafters', () => {
    const step = tokenFor(out, 'zinc-600');
    expect(figmaShape('color', step?.$value)).toBe(true);
    expect(nodeAt(step, '$extensions.rafters.value')).toEqual({
      colorSpace: 'oklch',
      components: [0.442, 0, 0],
    });
    expect(gamutMapped).toEqual([]);
  });

  it('maps a colour outside sRGB to it, keeping lightness and hue, and reports it', () => {
    const vivid = toDTCG(importColorFamily('vivid', '600', { l: 0.65, c: 0.3, h: 145, alpha: 1 }));
    const step = nodeAt(vivid.light, 'vivid.600') as Node;
    expect(figmaShape('color', step.$value)).toBe(true);
    expect(nodeAt(step, '$extensions.rafters.value.colorSpace')).toBe('oklch');
    expect(vivid.gamutMapped).toContain('vivid-600');
    // Mapped into sRGB with lightness and hue kept and chroma reduced.
    const mapped = hexToOKLCH(String(nodeAt(step, '$value.hex')));
    expect(mapped.l).toBeCloseTo(0.65, 1);
    expect(Math.abs(mapped.h - 145)).toBeLessThan(3);
    expect(mapped.c).toBeLessThan(0.3);
  });

  it('writes px dimensions, s durations, one loadable family name and numeric weights', () => {
    expect(tokenFor(out, 'spacing-2')).toMatchObject({
      $type: 'dimension',
      $value: { value: 8, unit: 'px' },
      $extensions: { rafters: { value: { value: 0.5, unit: 'rem' } } },
    });
    expect(tokenFor(out, 'rafters-duration-fast')).toMatchObject({
      $type: 'duration',
      $value: { value: 0.15, unit: 's' },
      $extensions: { rafters: { value: { value: 150, unit: 'ms' } } },
    });
    expect(tokenFor(out, 'font-sans')).toMatchObject({
      $type: 'fontFamily',
      $value: 'Noto Sans',
      $extensions: { rafters: { value: ['Noto Sans Variable', 'sans-serif'] } },
    });
    // A CSS keyword is skipped: the mono stack opens with ui-monospace.
    expect(nodeAt(tokenFor(out, 'font-mono'), '$value')).toBe('SFMono-Regular');
    expect(tokenFor(out, 'font-weight-semibold')).toMatchObject({ $type: 'number', $value: 600 });
    expect(tokenFor(out, 'line-height-lg')).toMatchObject({ $type: 'number', $value: 1.5 });
  });

  it('splits a typography token into its parts, each with its text scope', () => {
    const group = nodeAt(out, 'title.large') as Node;
    const part = (key: string) => group[key] as Node;
    expect(Object.keys(group).filter((k) => !k.startsWith('$'))).toEqual([
      'family',
      'style',
      'weight',
      'size',
      'lineHeight',
      'letterSpacing',
    ]);
    expect(part('family')).toEqual({
      $value: '{font.heading}',
      $type: 'fontFamily',
      $extensions: { 'com.figma.scopes': ['FONT_FAMILY'] },
    });
    expect(part('style')).toMatchObject({ $value: 'SemiBold', $type: 'string' });
    expect(part('weight')).toMatchObject({ $value: '{font.weight.semibold}', $type: 'number' });
    expect(part('size')).toMatchObject({ $value: '{font.size.3xl}', $type: 'dimension' });
    const size = resolve(out, 'font.size.3xl').$value as { value: number };
    const ratio = resolve(
      out,
      refTarget(nodeAt(group, '$extensions.rafters.value.lineHeight')) ?? '',
    ).$value as number;
    expect(part('lineHeight')).toMatchObject({
      $value: { value: Math.round(ratio * size.value * 1e6) / 1e6, unit: 'px' },
      $type: 'dimension',
    });
    expect(part('letterSpacing')).toMatchObject({ $type: 'dimension' });
    const scopes = Object.fromEntries(
      Object.entries(group)
        .filter(([k]) => !k.startsWith('$'))
        .map(([k, v]) => [k, nodeAt(v, '$extensions')]),
    );
    expect(scopes).toEqual({
      family: { 'com.figma.scopes': ['FONT_FAMILY'] },
      style: { 'com.figma.scopes': ['FONT_STYLE'] },
      weight: { 'com.figma.scopes': ['FONT_WEIGHT'] },
      size: { 'com.figma.scopes': ['FONT_SIZE'] },
      lineHeight: { 'com.figma.scopes': ['LINE_HEIGHT'] },
      letterSpacing: { 'com.figma.scopes': ['LETTER_SPACING'] },
    });
    expect(nodeAt(group, '$extensions.rafters.token.name')).toBe('title-large');
    expect(nodeAt(group, '$extensions.rafters.value.fontSize')).toBe('{font.size.3xl}');
  });

  it('splits a two-layer shadow token into its parts per layer, each with its effect scope', () => {
    const group = nodeAt(out, 'shadow.md') as Node;
    for (const layer of ['layer1', 'layer2']) {
      const parts = group[layer] as Node;
      expect(Object.keys(parts), layer).toEqual(['color', 'offsetX', 'offsetY', 'blur', 'spread']);
      expect(parts.color, layer).toMatchObject({
        $type: 'color',
        $extensions: { 'com.figma.scopes': ['EFFECT_COLOR'] },
      });
      for (const key of ['offsetX', 'offsetY', 'blur', 'spread']) {
        expect(parts[key], `${layer}.${key}`).toMatchObject({
          $type: 'dimension',
          $extensions: { 'com.figma.scopes': ['EFFECT_FLOAT'] },
        });
      }
    }
    expect(group.layer3).toBeUndefined();
    expect(nodeAt(group, '$extensions.rafters.token.name')).toBe('shadow-md');
    expect(Array.isArray(nodeAt(group, '$extensions.rafters.value'))).toBe(true);
    expect((nodeAt(out, 'shadow.primary.layer1.color') as Node).$value).toMatchObject({
      colorSpace: 'srgb',
      alpha: 0.12,
    });
  });
});

describe('toDTCG loses nothing', () => {
  /** Every source token, read back from both files' $extensions.rafters. */
  const readBack = (files: Node[]): Map<string, Token> => {
    const byName = new Map<string, Token>();
    for (const file of files) {
      for (const token of carriedTokens(JSON.parse(JSON.stringify(file)) as Node)) {
        const seen = byName.get(token.name);
        if (seen) expect(token, token.name).toEqual(seen);
        byName.set(token.name, token);
      }
    }
    return byName;
  };

  const roundTrips = (input: Token[]): void => {
    const result = toDTCG(input);
    const back = readBack([result.light as Node, result.dark as Node]);
    const source = new Map(input.map((t) => [t.name, t]));
    expect([...back.keys()].sort()).toEqual([...source.keys()].sort());
    for (const [name, token] of source) {
      expect(back.get(name), name).toEqual(JSON.parse(JSON.stringify(token)));
    }
  };

  it('rebuilds every token of the default system from $extensions.rafters', () => {
    roundTrips(tokens);
  });

  it('rebuilds every token of a system with designer overrides, reasons included', () => {
    const registry = new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
    registry.set('spacing-base', '0.3rem', { reason: 'denser dashboards', kind: 'designer' });
    registry.set('primary', { family: 'zinc', position: '700' }, { reason: 'brand review' });
    const input = [...registry.list()];
    expect(input.find((t) => t.name === 'spacing-base')?.userOverride?.reason).toBe(
      'denser dashboards',
    );
    roundTrips(input);
  });

  it('records every token Figma cannot hold whole, and reports it', () => {
    const namesFrom = (prefix: string) =>
      tokens.filter((t) => t.name.startsWith(prefix)).map((t) => t.name);
    const names = [
      ...namesFrom('screen-'),
      'breakpoint-motion-reduce',
      'breakpoint-dark',
      ...namesFrom('motion-keyframe-'),
      ...namesFrom('motion-cell-'),
      ...namesFrom('motion-semantic-'),
      'rafters-ease-standard',
      'focus-ring',
      'spacing-progression',
      'shadow-none',
      'focus-high-contrast',
    ];
    const reported = new Map(report.map(({ name, reason }) => [name, reason]));
    for (const name of names) {
      const input = tokens.find((t) => t.name === name);
      expect(tokenFor(out, name), name).toBeUndefined();
      expect(unrepresented[name], name).toEqual({
        reason: expect.any(String),
        token: input,
      });
      expect(reported.get(name), name).toEqual(expect.any(String));
    }
    expect(reported.get('rafters-ease-standard')).toContain('cubicBezier');
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
    ]);
    const record = nodeAt(result.light, '$extensions.rafters.unrepresented') as Record<
      string,
      { reason: string }
    >;
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
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const record = nodeAt(result.light, '$extensions.rafters.unrepresented') as Record<
      string,
      { reason: string }
    >;
    expect(Object.keys(record).sort()).toEqual([
      '__proto__',
      '__proto__-polluted',
      'spacing-constructor',
    ]);
    expect(record['spacing-constructor']?.reason).toContain('"constructor"');
  });

  it('makes a token whose light and dark forms differ unrepresented in both files', () => {
    const tok = (name: string, value: string): Token => ({
      name,
      value,
      category: 'spacing',
      namespace: 'spacing',
      userOverride: null,
    });
    const result = toDTCG([tok('gap', '1rem'), tok('gap--dark', '150ms')]);
    for (const file of [result.light, result.dark]) {
      expect(nodeAt(file, 'gap'), 'gap').toBeUndefined();
    }
    expect(Object.keys(nodeAt(result.light, '$extensions.rafters.unrepresented') as Node)).toEqual([
      'gap',
    ]);
    expect(Object.keys(nodeAt(result.dark, '$extensions.rafters.unrepresented') as Node)).toEqual([
      'gap--dark',
    ]);
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
    expect(tokensOf(toDTCG([dup('1rem'), dup('1rem')]).light as Node)).toHaveLength(1);
  });

  it('moving neutral to another family changes only the role scale', () => {
    const registry = new TokenRegistry(generateBaseSystem().allTokens, REGISTRY_PLUGINS);
    const before = toDTCG([...registry.list()]).light as Node;
    registry.set('neutral', { family: 'silver-true-sky', position: '500' }, { reason: 'test' });
    const moved = toDTCG([...registry.list()]).light as Node;
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
    expect(leftRole).toEqual(['neutral.$root', 'info.foreground']);
  });
});
