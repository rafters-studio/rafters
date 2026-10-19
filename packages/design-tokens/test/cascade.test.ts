import { buildColorValue } from '@rafters/color-utils';
import type { ColorReference, ColorValue, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  CircularDependencyError,
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  mirrorPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
  REGISTRY_PLUGINS,
} from '../src/index.js';

const minimalScale = [
  { l: 0.97, c: 0.02, h: 240 },
  { l: 0.93, c: 0.05, h: 240 },
  { l: 0.85, c: 0.1, h: 240 },
  { l: 0.75, c: 0.14, h: 240 },
  { l: 0.65, c: 0.16, h: 240 },
  { l: 0.55, c: 0.18, h: 240 },
  { l: 0.45, c: 0.18, h: 240 },
  { l: 0.35, c: 0.16, h: 240 },
  { l: 0.25, c: 0.14, h: 240 },
  { l: 0.18, c: 0.1, h: 240 },
  { l: 0.12, c: 0.07, h: 240 },
];

function buildAccentFamily(name = 'accent'): ColorValue {
  return {
    name,
    scale: minimalScale,
    accessibility: {
      wcagAAA: {
        normal: [
          [0, 8],
          [1, 9],
          [2, 9],
          [3, 9],
          [4, 9],
          [5, 0],
          [5, 9],
          [6, 0],
          [7, 0],
          [8, 0],
          [9, 0],
        ],
        large: [],
      },
      wcagAA: { normal: [], large: [] },
      onWhite: {
        wcagAA: false,
        wcagAAA: false,
        contrastRatio: 1,
        aa: [],
        aaa: [],
        normal: [],
        large: [],
      },
      onBlack: {
        wcagAA: false,
        wcagAAA: false,
        contrastRatio: 1,
        aa: [],
        aaa: [],
        normal: [],
        large: [],
      },
    },
  };
}

function buildAccentToken(value: ColorValue): Token {
  return {
    name: 'accent',
    namespace: 'color',
    category: 'color',
    value,
    userOverride: null,
  };
}

function semanticToken(name: string): Token {
  return { name, namespace: 'semantic', category: 'color', value: '', userOverride: null };
}

function familyTokenSlot(name: string): Token {
  return { name, namespace: 'color', category: 'color', value: '', userOverride: null };
}

function setupSemanticChain(): TokenRegistry {
  const r = new TokenRegistry(
    [
      buildAccentToken(buildAccentFamily()),
      semanticToken('primary'),
      semanticToken('primary-foreground'),
      semanticToken('primary-hover'),
      semanticToken('primary-active'),
      semanticToken('primary-dark'),
    ],
    [scalePlugin, contrastPlugin, statePlugin, invertPlugin, mirrorPlugin],
  );
  // accent family → semantic primary (position 5) → primary-foreground, primary-hover, primary-hover-foreground
  // and dark counterparts via invert
  r.bind('primary', 'scale', { familyName: 'accent', scalePosition: 5 });
  r.bind('primary-foreground', 'contrast', { against: 'primary', level: 'AAA' });
  r.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
  r.bind('primary-active', 'state', { from: 'primary', stateType: 'active' });
  r.bind('primary-dark', 'invert', { fromToken: 'primary' });
  return r;
}

describe('cascade integration', () => {
  describe('family remap propagates through the full semantic chain', () => {
    it('all derived tokens recompute when family is replaced', () => {
      const r = setupSemanticChain();

      const initial = {
        primary: r.get('primary')?.value,
        primaryFg: r.get('primary-foreground')?.value,
        primaryHover: r.get('primary-hover')?.value,
        primaryActive: r.get('primary-active')?.value,
        primaryDark: r.get('primary-dark')?.value,
      };
      expect(initial.primary).toEqual({ family: 'accent', position: '500' });
      expect(initial.primaryHover).toEqual({ family: 'accent', position: '600' });
      expect(initial.primaryActive).toEqual({ family: 'accent', position: '700' });

      const remapped = buildAccentFamily('remapped');
      r.set('accent', remapped, { reason: 'test' });

      expect(r.get('accent')?.value).toEqual(remapped);
      expect(r.get('primary')?.value).toEqual({ family: 'accent', position: '500' });
      expect(r.get('primary-hover')?.value).toEqual({ family: 'accent', position: '600' });
      expect(r.get('primary-active')?.value).toEqual({ family: 'accent', position: '700' });
      expect(r.get('primary-foreground')?.value).toBeDefined();
      expect(r.get('primary-dark')?.value).toBeDefined();
    });
  });

  describe('userOverride anchors hold under upstream change', () => {
    it('anchored hover keeps its value when family changes', () => {
      const r = setupSemanticChain();
      const manualHover = { family: 'override', position: 'manual' };
      r.set('primary-hover', manualHover, { reason: 'designer chose specific tone' });

      expect(r.get('primary-hover')?.value).toEqual(manualHover);
      expect(r.get('primary-hover')?.userOverride?.reason).toBe('designer chose specific tone');

      r.set('accent', buildAccentFamily('changed'), { reason: 'test' });
      expect(r.get('primary-hover')?.value).toEqual(manualHover);
    });

    it('downstream of an anchor recomputes from the anchor value (chained binding)', () => {
      // The override on primary remaps to a different position; primary-fg
      // re-derives via contrast against the new position. The anchor on
      // primary blocks scale@accent@5 from clobbering it; primary-fg's
      // contrast binding still re-runs because primary changed.
      const r = new TokenRegistry(
        [
          buildAccentToken(buildAccentFamily()),
          semanticToken('primary'),
          semanticToken('primary-fg'),
        ],
        [scalePlugin, contrastPlugin],
      );
      r.bind('primary', 'scale', { familyName: 'accent', scalePosition: 5 });
      r.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' });

      const downstreamBefore = r.get('primary-fg')?.value;
      // Override primary to a valid position; the WCAG pair list has [5,0]
      // so contrast partner of position 5 is position 0. Move primary to
      // position 8 (which the family's pair list also covers: [8, 0]).
      r.set('primary', { family: 'accent', position: '800' }, { reason: 'manual' });
      expect(r.get('primary')?.userOverride?.reason).toBe('manual');
      const downstreamAfter = r.get('primary-fg')?.value;
      // Both positions 5 and 8 pair with position 0 in the test family.
      expect(downstreamAfter).toEqual(downstreamBefore);
    });
  });

  describe('cycle detection at bind time', () => {
    it('rejects a binding that creates a direct cycle', () => {
      const r = new TokenRegistry([familyTokenSlot('a'), familyTokenSlot('b')], [scalePlugin]);
      const family = buildAccentFamily();
      r.set('a', family, { reason: 'test' });
      r.set('b', family, { reason: 'test' });
      r.bind('a', 'scale', { familyName: 'b', scalePosition: 5 });
      expect(() => r.bind('b', 'scale', { familyName: 'a', scalePosition: 5 })).toThrow(
        CircularDependencyError,
      );
    });

    it('rejects a binding that creates a transitive cycle', () => {
      const r = new TokenRegistry(
        [familyTokenSlot('a'), familyTokenSlot('b'), familyTokenSlot('c')],
        [scalePlugin],
      );
      const family = buildAccentFamily();
      r.set('a', family, { reason: 'test' });
      r.set('b', family, { reason: 'test' });
      r.set('c', family, { reason: 'test' });
      r.bind('b', 'scale', { familyName: 'a', scalePosition: 5 });
      r.bind('c', 'scale', { familyName: 'b', scalePosition: 5 });
      expect(() => r.bind('a', 'scale', { familyName: 'c', scalePosition: 5 })).toThrow(
        CircularDependencyError,
      );
    });
  });

  describe('topological ordering during cascade', () => {
    it('recomputes upstream nodes before downstream when both are dependents', () => {
      const r = new TokenRegistry(
        [
          buildAccentToken(buildAccentFamily()),
          semanticToken('primary'),
          semanticToken('primary-hover'),
        ],
        [scalePlugin, statePlugin],
      );
      r.bind('primary', 'scale', { familyName: 'accent', scalePosition: 5 });
      // primary-hover depends on accent (basePosition + offset → '600' position)
      r.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
      r.set('accent', buildAccentFamily('mutated'), { reason: 'test' });
      expect(r.get('primary')?.value).toEqual({ family: 'accent', position: '500' });
      expect(r.get('primary-hover')?.value).toEqual({ family: 'accent', position: '600' });
    });
  });

  describe('undo after cascade', () => {
    it('restores all dependents when undoing a family change', () => {
      const r = setupSemanticChain();
      const before = {
        accent: r.get('accent')?.value,
        primary: r.get('primary')?.value,
        primaryHover: r.get('primary-hover')?.value,
      };
      r.set('accent', buildAccentFamily('different'), { reason: 'test' });
      r.undo();
      expect(r.get('accent')?.value).toEqual(before.accent);
      expect(r.get('primary')?.value).toEqual(before.primary);
      expect(r.get('primary-hover')?.value).toEqual(before.primaryHover);
    });
  });

  describe('semantic role as family reference (neutral pattern)', () => {
    function setupNeutralChain(): TokenRegistry {
      const zinc: Token = {
        name: 'zinc',
        namespace: 'color',
        category: 'color',
        value: buildAccentFamily('zinc'),
        userOverride: null,
      };
      const r = new TokenRegistry(
        [
          zinc,
          semanticToken('neutral'),
          semanticToken('background'),
          semanticToken('foreground'),
          semanticToken('background--dark'),
        ],
        [scalePlugin, invertPlugin, mirrorPlugin],
      );
      r.bind('neutral', 'scale', { familyName: 'zinc', scalePosition: 5 });
      r.bind('background', 'scale', { familyName: 'neutral', scalePosition: 0 });
      r.bind('foreground', 'scale', { familyName: 'neutral', scalePosition: 10 });
      r.bind('background--dark', 'invert', { fromToken: 'background' });
      return r;
    }

    it('scale plugin resolves through a ColorReference', () => {
      const r = setupNeutralChain();
      expect(r.get('background')?.value).toEqual({ family: 'zinc', position: '50' });
      expect(r.get('foreground')?.value).toEqual({ family: 'zinc', position: '950' });
    });

    it('invert plugin resolves through a ColorReference', () => {
      const r = setupNeutralChain();
      const dark = r.get('background--dark')?.value;
      expect(dark).toBeDefined();
      expect((dark as { family: string }).family).toBe('zinc');
    });

    it('reassigning neutral cascades to all dependents', () => {
      const r = setupNeutralChain();
      const newFamily = buildAccentFamily('mud');
      r.define({
        name: 'mud',
        namespace: 'color',
        category: 'color',
        value: newFamily,
        userOverride: null,
      });
      r.set('neutral', { family: 'mud', position: '500' }, { reason: 'reassign neutral' });

      expect(r.get('background')?.value).toEqual({ family: 'mud', position: '50' });
      expect(r.get('foreground')?.value).toEqual({ family: 'mud', position: '950' });
      const dark = r.get('background--dark')?.value;
      expect((dark as { family: string }).family).toBe('mud');
    });
  });

  describe('border, ring, subtle cascade through the state plugin', () => {
    function setupSurfaceChain(): TokenRegistry {
      const r = new TokenRegistry(
        [
          buildAccentToken(buildAccentFamily()),
          semanticToken('surface'),
          semanticToken('surface-border'),
          semanticToken('surface-ring'),
          semanticToken('surface-subtle'),
          semanticToken('surface-hover'),
        ],
        [scalePlugin, contrastPlugin, statePlugin, invertPlugin, mirrorPlugin],
      );
      r.bind('surface', 'scale', { familyName: 'accent', scalePosition: 1 });
      r.bind('surface-border', 'state', { from: 'surface', stateType: 'border' });
      r.bind('surface-ring', 'state', { from: 'surface', stateType: 'ring' });
      r.bind('surface-subtle', 'state', { from: 'surface', stateType: 'subtle' });
      r.bind('surface-hover', 'state', { from: 'surface', stateType: 'hover' });
      return r;
    }

    it('border derives from parent, not hardcoded', () => {
      const r = setupSurfaceChain();
      const surface = r.get('surface')?.value as { family: string; position: string };
      const border = r.get('surface-border')?.value as { family: string; position: string };
      expect(border.family).toBe(surface.family);
      expect(border.position).not.toBe(surface.position);
    });

    it('ring stays at the same position as parent', () => {
      const r = setupSurfaceChain();
      const surface = r.get('surface')?.value as { family: string; position: string };
      const ring = r.get('surface-ring')?.value as { family: string; position: string };
      expect(ring.family).toBe(surface.family);
      expect(ring.position).toBe(surface.position);
    });

    it('subtle steps opposite direction from hover', () => {
      const r = setupSurfaceChain();
      // A mid-scale surface, so neither step reaches an end of the ladder
      // (at an end a step reflects back, #2668).
      r.bind('surface', 'scale', { familyName: 'accent', scalePosition: 5 });
      const surface = r.get('surface')?.value as { family: string; position: string };
      const hover = r.get('surface-hover')?.value as { family: string; position: string };
      const subtle = r.get('surface-subtle')?.value as { family: string; position: string };
      const surfaceIdx = Number.parseInt(surface.position);
      const hoverIdx = Number.parseInt(hover.position);
      const subtleIdx = Number.parseInt(subtle.position);
      expect(hoverIdx).toBeGreaterThan(surfaceIdx);
      expect(subtleIdx).toBeLessThan(surfaceIdx);
    });

    it('border cascades when parent is remapped', () => {
      const r = setupSurfaceChain();
      const beforeBorder = r.get('surface-border')?.value as { family: string; position: string };
      expect(beforeBorder.family).toBe('accent');

      const newFamily = buildAccentFamily('sky');
      r.define({
        name: 'sky',
        namespace: 'color',
        category: 'color',
        value: newFamily,
        userOverride: null,
      });
      r.set('surface', { family: 'sky', position: '200' }, { reason: 'remap to sky' });

      const afterBorder = r.get('surface-border')?.value as { family: string; position: string };
      expect(afterBorder.family).toBe('sky');
    });

    it('userOverride on border anchors it against parent remap', () => {
      const r = setupSurfaceChain();
      const pinned = { family: 'accent', position: '800' };
      r.set('surface-border', pinned, { reason: 'designer override' });
      expect(r.get('surface-border')?.value).toEqual(pinned);

      r.set('surface', { family: 'accent', position: '500' }, { reason: 'remap' });
      expect(r.get('surface-border')?.value).toEqual(pinned);
    });
  });
});

// #2743: semantic colour mappings that belong to a role name that role, so a
// role change re-derives them.
const ROLE_PLUGINS = REGISTRY_PLUGINS; // the list init.ts registers
const ROLES = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'highlight',
  'muted',
  'success',
  'warning',
  'destructive',
  'info',
];
const RELINKED = [
  'alert',
  'input-invalid',
  'ring-destructive',
  'input-valid',
  'ring-success',
  'ring-warning',
  'ring-info',
  'link',
  'selection',
  'link-visited',
  'ring-primary',
  'sidebar-primary',
  'sidebar-accent',
  'sidebar-muted',
];
const isRef = (v: unknown): v is ColorReference =>
  typeof v === 'object' && v !== null && 'family' in v && 'position' in v;
const position = (reg: TokenRegistry, name: string): string => {
  const v: unknown = reg.get(name)?.value;
  if (!isRef(v)) throw new Error(name);
  return String(v.position);
};
// resolve a ColorReference through role names to its palette step
const resolved = (reg: TokenRegistry, name: string): string => {
  let v: unknown = reg.get(name)?.value;
  for (let hop = 0; hop < 8 && isRef(v); hop++) {
    const fam = reg.get(v.family);
    if (fam?.namespace === 'color') return `${v.family}-${v.position}`;
    const next: unknown = fam?.value;
    if (!isRef(next)) break;
    v = { family: next.family, position: v.position };
  }
  throw new Error(`unresolved ${name}`);
};
const newFamily = (reg: TokenRegistry, name: string, h: number) => {
  const zinc = reg.get('zinc') as Token;
  reg.define({
    ...zinc,
    name,
    value: { ...buildColorValue({ l: 0.55, c: 0.15, h, alpha: 1 }), name },
  });
};

describe('semantic colour roles', () => {
  it('names the role in dependsOn and the binding', () => {
    const tokens = generateBaseSystem().allTokens;
    for (const name of RELINKED) {
      const t = tokens.find((x) => x.name === name);
      if (!t) throw new Error(`missing ${name}`);
      const role = t.dependsOn?.[0];
      expect(ROLES).toContain(role);
      expect((t.binding?.input as { familyName?: string }).familyName).toBe(role);
    }
  });

  it('keeps every default palette step', () => {
    // fixture: the 14 tokens' resolved palette steps today (measured at c3c0a24b), light and dark
    const TODAY: Record<string, string> = {
      alert: 'silver-bold-fire-truck-600',
      'alert--dark': 'silver-bold-fire-truck-500',
      'input-invalid': 'silver-bold-fire-truck-500',
      'input-invalid--dark': 'silver-bold-fire-truck-500',
      'ring-destructive': 'silver-bold-fire-truck-600',
      'ring-destructive--dark': 'silver-bold-fire-truck-400',
      'input-valid': 'silver-true-citrine-500',
      'input-valid--dark': 'silver-true-citrine-500',
      'ring-success': 'silver-true-citrine-600',
      'ring-success--dark': 'silver-true-citrine-400',
      'ring-warning': 'silver-true-honey-600',
      'ring-warning--dark': 'silver-true-honey-400',
      'ring-info': 'silver-true-sky-600',
      'ring-info--dark': 'silver-true-sky-400',
      link: 'silver-true-sky-700',
      'link--dark': 'silver-true-sky-400',
      selection: 'silver-true-sky-200',
      'selection--dark': 'silver-true-sky-800',
      'link-visited': 'silver-true-violet-700',
      'link-visited--dark': 'silver-true-violet-400',
      'ring-primary': 'zinc-900',
      'ring-primary--dark': 'zinc-50',
      'sidebar-primary': 'zinc-900',
      'sidebar-primary--dark': 'zinc-50',
      'sidebar-accent': 'zinc-100',
      'sidebar-accent--dark': 'zinc-800',
      'sidebar-muted': 'zinc-500',
      'sidebar-muted--dark': 'zinc-400',
    };
    const reg = new TokenRegistry(generateBaseSystem().allTokens, ROLE_PLUGINS);
    for (const [name, step] of Object.entries(TODAY)) expect(resolved(reg, name)).toBe(step);
  });

  it('leaves only the charts unchanged when every role moves', () => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, ROLE_PLUGINS);
    const before = new Map(
      [...reg.list()]
        .filter((t) => t.namespace === 'semantic')
        .map((t) => [t.name, JSON.stringify(t.value)]),
    );
    for (const [i, role] of ROLES.entries()) {
      newFamily(reg, `test-${role}`, i * 36);
      reg.set(role, { family: `test-${role}`, position: position(reg, role) }, { reason: 'test' });
    }
    const unchanged = [...before]
      .filter(([n, v]) => JSON.stringify(reg.get(n)?.value) === v)
      .map(([n]) => n.replace(/--dark$/, ''));
    expect([...new Set(unchanged)].sort()).toEqual([
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
    ]);
  });

  it.each([
    ['primary', ['ring-primary', 'sidebar-primary']],
    ['accent', ['sidebar-accent']],
    ['muted', ['sidebar-muted']],
  ])('setting %s alone moves its tokens', (role, moved) => {
    const reg = new TokenRegistry(generateBaseSystem().allTokens, ROLE_PLUGINS);
    const before = new Map(moved.map((n) => [n, JSON.stringify(reg.get(n)?.value)]));
    newFamily(reg, 'test-family', 200);
    reg.set(role, { family: 'test-family', position: position(reg, role) }, { reason: 'test' });
    for (const n of moved) expect(JSON.stringify(reg.get(n)?.value)).not.toBe(before.get(n));
  });
});
