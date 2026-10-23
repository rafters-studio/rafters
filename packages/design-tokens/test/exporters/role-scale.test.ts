// packages/design-tokens/test/exporters/role-scale.test.ts
import { fileURLToPath } from 'node:url';
import type { Token } from '@rafters/shared';
import { SEMANTIC_FAMILY_ROLES } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  generateBaseSystem,
  registryToCompiled,
  registryToTailwind,
  registryToTailwindStatic,
  TokenRegistry,
  tokensToTailwind,
} from '../../src/index.js';
import { REGISTRY_PLUGINS } from '../../src/plugins/index.js';
import semanticColors from './fixtures/semantic-colors.json' with { type: 'json' };

const PLUGINS = REGISTRY_PLUGINS; // the list init.ts registers

// Resolve a custom property to its literal in light (:root + @theme) or dark (+ .dark).
type Ctx = Map<string, string>;
const decls = (css: string, re: RegExp): Ctx => {
  const m = new Map<string, string>();
  for (const b of css.matchAll(re))
    for (const d of b[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) m.set(d[1]!, d[2]!.trim());
  return m;
};
const contexts = (css: string) => {
  const theme = decls(css, /@theme(?: inline)? \{([\s\S]*?)\n\}/g),
    root = decls(css, /:root, :host \{([\s\S]*?)\n\}/g),
    dark = decls(css, /\n\.dark \{([\s\S]*?)\n\}/g);
  const light = new Map([...theme, ...root]);
  return { theme, light, dark: new Map([...light, ...dark]) };
};
const resolve = (ctx: Ctx, v: string, depth = 0): string => {
  const val = ctx.get(v);
  if (val === undefined || depth > 20) return `?${v}`;
  const r = val.match(/^var\((--[\w-]+)\)$/);
  return r ? resolve(ctx, r[1]!, depth + 1) : val;
};
const utilities = (theme: Ctx) =>
  [...theme.keys()].filter(
    (k) =>
      k.startsWith('--color-') &&
      /^var\(--[a-z0-9-]+\)$/.test(theme.get(k) ?? '') &&
      !/-\d+$/.test(k),
  );
const movedBySwap = (css: string, role: string): string[] => {
  const re = new RegExp(`^(\\s*--rafters-${role}-(\\d+)): var\\([^)]+\\);$`, 'gm');
  const swapped = css.replace(
    re,
    (_m, head: string, s: string) => `${head}: var(--color-silver-true-sky-${s});`,
  );
  const a = contexts(css),
    b = contexts(swapped);
  return utilities(a.theme).filter(
    (u) => resolve(a.light, u) !== resolve(b.light, u) || resolve(a.dark, u) !== resolve(b.dark, u),
  );
};

describe('role scale', () => {
  const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
  const css = registryToTailwind(reg);
  it('emits the role layer', () => {
    expect(css).toContain('--rafters-neutral-900: var(--color-zinc-900);');
    expect(css).toContain('--rafters-primary-900: var(--rafters-neutral-900);');
    expect(css).toContain('--rafters-primary: var(--rafters-primary-900);');
    expect(css).toContain('--rafters-primary-hover: var(--rafters-primary-950);');
    expect(css).toContain('--rafters-dark-primary: var(--rafters-primary-50);');
    expect(css).toContain('--color-primary-950: var(--rafters-primary-950);');
    expect(css).not.toMatch(/--rafters-tertiary-\d+:/);
  });
  it('renders every colour utility as today', () => {
    // BASELINE: the resolved light and dark value of every --color-<semantic> utility, captured from
    // registryToTailwind before this change and committed as test/exporters/fixtures/semantic-colors.json
    const baseline: Record<string, { light: string; dark: string }> = semanticColors;
    const ctx = contexts(css);
    for (const u of utilities(ctx.theme))
      expect({ light: resolve(ctx.light, u), dark: resolve(ctx.dark, u) }).toEqual(baseline[u]);
    // Both directions: no baseline utility was dropped, none was added.
    expect(utilities(ctx.theme).sort()).toEqual(Object.keys(baseline).sort());
    expect(Object.keys(baseline)).toHaveLength(202);
  });
  it('moves exactly what a role owns', () => {
    const swapped = css.replace(
      /^(\s*--rafters-primary-(\d+)): var\([^)]+\);$/gm,
      (_m, head: string, s: string) => `${head}: var(--color-silver-true-sky-${s});`,
    );
    const a = contexts(css),
      b = contexts(swapped);
    const moved = utilities(a.theme).filter(
      (u) =>
        resolve(a.light, u) !== resolve(b.light, u) || resolve(a.dark, u) !== resolve(b.dark, u),
    );
    expect(moved.length).toBe(16); // the utilities whose owner is primary
  });
  it('builds the same role layer from a plain token list', () => {
    const plain = tokensToTailwind(generateBaseSystem().allTokens);
    const roleLines = (c: string) => c.split('\n').filter((l) => /--rafters-[a-z]+-\d+:/.test(l));
    expect(roleLines(plain)).toEqual(roleLines(css));
  });
});

describe('role scale: ownership', () => {
  const reg = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
  const css = registryToTailwind(reg);

  it('emits 11 steps for each role with a root', () => {
    const roles = SEMANTIC_FAMILY_ROLES.filter((r) => r !== 'tertiary');
    for (const role of roles) {
      const steps = css.match(new RegExp(`^\\s*--rafters-${role}-\\d+:`, 'gm')) ?? [];
      expect(steps, role).toHaveLength(11);
    }
    expect(css).toContain('--rafters-destructive-600: var(--color-silver-bold-fire-truck-600);');
    for (const role of ['primary', 'secondary', 'accent', 'muted']) {
      expect(css).toContain(`--rafters-${role}-500: var(--rafters-neutral-500);`);
    }
  });

  it('points every semantic declaration at a role step except the charts', () => {
    const semanticNames = new Set(
      generateBaseSystem()
        .allTokens.filter((t) => t.namespace === 'semantic')
        .map((t) => t.name.replace(/--dark$/, '')),
    );
    const roleStep = new RegExp(`^(?:${SEMANTIC_FAMILY_ROLES.join('|')})-\\d+$`);
    const root = css.match(/:root, :host \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const semantic = [...root.matchAll(/^\s*--rafters-(?:dark-)?([\w-]+): (var\([^)]+\));$/gm)]
      .map((m) => ({ name: m[1] ?? '', value: m[2] ?? '' }))
      .filter((d) => !roleStep.test(d.name))
      // The mapped namespaces' --rafters-* layer shares :root (#2825); only colours here.
      .filter((d) => semanticNames.has(d.name));
    const onPalette = semantic.filter((d) => !/^var\(--rafters-[a-z]+-\d+\)$/.test(d.value));
    expect([...new Set(onPalette.map((d) => d.name))].sort()).toEqual([
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
    ]);
    expect(semantic.length - onPalette.length).toBe(404);
  });

  it('a change to neutral moves the roles that hang off it and no others', () => {
    const moved = movedBySwap(css, 'neutral');
    expect(moved).toHaveLength(130);
    for (const u of ['--color-primary', '--color-secondary', '--color-accent', '--color-muted']) {
      expect(moved).toContain(u);
    }
    // #2668: a foreground whose own role has no AA pair falls back to the neutral role and
    // rides its step, so it moves with neutral.
    const fallbacks = [
      '--color-alert-foreground',
      '--color-destructive-foreground',
      '--color-success-foreground',
    ];
    for (const u of fallbacks) expect(moved).toContain(u);
    for (const role of ['destructive', 'success', 'warning', 'info', 'highlight']) {
      expect(
        moved.filter(
          (u) =>
            !fallbacks.includes(u) && (u === `--color-${role}` || u.startsWith(`--color-${role}-`)),
        ),
      ).toEqual([]);
    }
  });

  it('bridges the role steps in the static sheet', () => {
    const staticCss = registryToTailwindStatic(reg);
    expect(staticCss).toContain('--color-primary-950: var(--rafters-primary-950);');
    expect(staticCss).toContain('--color-primary: var(--primary);');
  });

  it('throws when an owner walk does not end', () => {
    const tokens: Token[] = generateBaseSystem().allTokens.filter((t) => t.name !== 'chart-1');
    const loop = (name: string, parent: string): Token => ({
      name,
      value: { family: 'zinc', position: '500' },
      category: 'color',
      namespace: 'semantic',
      binding: { plugin: 'state', input: { from: parent, stateType: 'hover' } },
      userOverride: null,
    });
    tokens.push(loop('loop-a', 'loop-b'), loop('loop-b', 'loop-a'));
    expect(() => tokensToTailwind(tokens)).toThrow(/"loop-a".*12 hops/);
  });

  it('throws when two role scales name each other', () => {
    const tokens = generateBaseSystem().allTokens.map((t) => {
      if (t.name === 'primary') return { ...t, value: { family: 'secondary', position: '900' } };
      if (t.name === 'secondary') return { ...t, value: { family: 'primary', position: '100' } };
      return t;
    });
    expect(() => tokensToTailwind(tokens)).toThrow(
      /Role scales form a cycle at "(primary|secondary)"/,
    );
  });

  it('throws when the CSS step and the registry step disagree', () => {
    const generated = generateBaseSystem().allTokens;
    const stepOf = (name: string): string =>
      String((generated.find((t) => t.name === name)?.value as { position: unknown }).position);
    const tokens = generated.map((t) =>
      t.name === 'primary-hover' ? { ...t, dependsOn: ['primary', 'primary-active--dark'] } : t,
    );
    expect(() => tokensToTailwind(tokens)).toThrow(
      `"primary-hover" (dark): CSS step ${stepOf('primary-hover--dark')} disagrees with registry step ${stepOf('primary-active--dark')}`,
    );
  });

  describe('renders what the registry stores', () => {
    const SKY_600 = 'oklch(0.559 0.097 213)';
    const build = (override?: string) => {
      const r = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
      if (override) {
        r.set(override, { family: 'silver-true-sky', position: '600' }, { reason: 'designer' });
      }
      return { r, ctx: contexts(registryToTailwind(r)) };
    };
    // Every semantic token, light and dark: its --color-<name> utility resolves
    // to the colour its stored palette and step resolve to.
    const mismatches = (r: TokenRegistry, ctx: ReturnType<typeof contexts>): string[] => {
      const out: string[] = [];
      for (const t of r.list()) {
        if (t.namespace !== 'semantic' || t.name.endsWith('--dark')) continue;
        if (typeof t.value !== 'object' || !('family' in t.value)) continue;
        for (const mode of ['light', 'dark'] as const) {
          const stored = mode === 'light' ? t : (r.get(`${t.name}--dark`) ?? t);
          if (typeof stored.value !== 'object' || !('family' in stored.value)) continue;
          const want = resolve(
            ctx.light,
            `--color-${stored.value.family}-${stored.value.position}`,
          );
          const got = resolve(ctx[mode], `--color-${t.name}`);
          if (want !== got) out.push(`${t.name} ${mode}: ${got} != ${want}`);
        }
      }
      return out;
    };

    it('at the default system', () => {
      const { r, ctx } = build();
      expect(mismatches(r, ctx)).toEqual([]);
    });

    it('after a role is set to another palette', () => {
      const { r, ctx } = build('primary');
      expect(mismatches(r, ctx)).toEqual([]);
      expect(resolve(ctx.light, '--color-primary')).toBe(SKY_600);
      expect(resolve(ctx.light, '--color-primary-600')).toBe(SKY_600);
      expect(resolve(ctx.light, '--color-primary-hover')).toBe(
        resolve(ctx.light, '--color-silver-true-sky-700'),
      );
      expect(resolve(ctx.light, '--color-secondary')).toBe(resolve(ctx.light, '--color-zinc-100'));
    });

    it('after a dependent is set to another palette', () => {
      const { r, ctx } = build('primary-hover');
      expect(mismatches(r, ctx)).toEqual([]);
      expect(resolve(ctx.light, '--color-primary-hover')).toBe(SKY_600);
      expect(resolve(ctx.light, '--color-primary')).toBe(resolve(ctx.light, '--color-zinc-900'));
    });
  });

  it('compiles the role utilities', async () => {
    const source = fileURLToPath(new URL('./fixtures/role-utilities.html', import.meta.url));
    const compiled = await registryToCompiled(reg, { minify: false, contentSources: [source] });
    const rule = (selector: string) =>
      compiled.match(new RegExp(`\\.${selector} \\{([^}]*)\\}`))?.[1] ?? '';
    expect(rule('bg-primary-950')).toContain('var(--rafters-primary-950)');
    expect(rule('bg-neutral-500')).toContain('var(--rafters-neutral-500)');
    expect(rule('text-destructive-600')).toContain('var(--rafters-destructive-600)');
    expect(rule('border-info-400')).toContain('var(--rafters-info-400)');
    expect(rule('ring-primary-900')).toContain('var(--rafters-primary-900)');
    expect(rule('bg-muted-100')).toContain('var(--rafters-muted-100)');
  });
});
