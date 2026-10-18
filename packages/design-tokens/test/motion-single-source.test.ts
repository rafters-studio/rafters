/**
 * One motion duration and easing set (#2746).
 *
 * The `rafters-duration-*` and `rafters-ease-*` leaves are the only duration and
 * curve tokens. Every motion token that names a duration or a curve references
 * those leaves, in its CSS value and in its `dependsOn`, so retuning a leaf moves
 * everything built on it.
 */
import { describe, expect, it } from 'vitest';
import { generateBaseSystem, registryToTailwind, TokenRegistry } from '../src/index.js';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  scalePlugin,
  statePlugin,
} from '../src/plugins/index.js';

const PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin, mirrorPlugin];

const COMPOSITES = [
  'motion-fade-in',
  'motion-fade-out',
  'motion-slide-in',
  'motion-slide-out',
  'motion-scale-in',
] as const;

/** What each composite emitted as a literal before it referenced the leaves. */
const TODAY: Record<(typeof COMPOSITES)[number], string> = {
  'motion-fade-in': '150ms cubic-bezier(0, 0, 0.2, 1)',
  'motion-fade-out': '150ms cubic-bezier(0.4, 0, 1, 1)',
  'motion-slide-in': '350ms cubic-bezier(0, 0, 0.2, 1)',
  'motion-slide-out': '150ms cubic-bezier(0.4, 0, 1, 1)',
  'motion-scale-in': '350ms cubic-bezier(0.2, 0.8, 0.2, 1)',
};

/**
 * The first `--name: value;` declaration of each property in the sheet. Later
 * ones are overrides under a condition (prefers-reduced-motion zeroes the
 * durations), not the default the composite resolves against.
 */
function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of css.matchAll(/(--[a-z0-9-]+):\s*([^;{}]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined && !out.has(name)) out.set(name, value.trim());
  }
  return out;
}

/** Substitute var() references against the sheet's declarations, as a browser would. */
function resolve(value: string, decls: Map<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`var() chain too deep resolving "${value}"`);
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (_, name: string) => {
    const target = decls.get(name);
    if (target === undefined) throw new Error(`dangling var(${name})`);
    return resolve(target, decls, depth + 1);
  });
}

function css(registry = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS)): string {
  return registryToTailwind(registry);
}

describe('one motion duration and easing set (#2746)', () => {
  const tokens = generateBaseSystem().allTokens;
  const names = new Set(tokens.map((t) => t.name));

  it('emits no legacy duration-tier or easing token', () => {
    expect(tokens.filter((t) => /^motion-duration-(?!base$)|^motion-easing-/.test(t.name))).toEqual(
      [],
    );
  });

  it("names only existing tokens in every motion token's dependsOn", () => {
    for (const t of tokens.filter((t) => t.namespace === 'motion')) {
      for (const d of t.dependsOn ?? []) expect(names.has(d), `${t.name} -> ${d}`).toBe(true);
    }
  });

  it('names in each composite and semantic dependsOn exactly the two leaves its CSS reads', () => {
    for (const name of COMPOSITES) {
      const token = tokens.find((t) => t.name === name);
      const refs = [...String(token?.value).matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]);
      expect(refs, name).toHaveLength(2);
      expect(token?.dependsOn, name).toEqual(refs);
    }
    const semantic = tokens.filter((t) => t.name.startsWith('motion-semantic-'));
    expect(semantic.length).toBeGreaterThan(0);
    const utilities = css();
    for (const token of semantic) {
      const spec = JSON.parse(String(token.value)) as { durationTier: string; curve: string };
      const leaves = [`rafters-duration-${spec.durationTier}`, `rafters-ease-${spec.curve}`];
      expect(token.dependsOn, token.name).toEqual(leaves);
      // The @utility the exporter emits for this token reads those same two leaves.
      const block = utilities.match(
        new RegExp(`@utility ${token.name.replace('motion-semantic-', 'motion-')} \\{[^}]*`),
      )?.[0];
      expect(block, token.name).toBeDefined();
      for (const leaf of leaves) expect(block, token.name).toContain(`var(--${leaf})`);
    }
  });

  it('emits each composite as a reference to the leaves', () => {
    const sheet = css();
    expect(sheet).toContain(
      '--motion-fade-in: var(--rafters-duration-fast) var(--rafters-ease-enter);',
    );
    expect(sheet).toContain(
      '--motion-scale-in: var(--rafters-duration-normal) var(--rafters-ease-spring-snappy);',
    );
  });

  it("resolves each composite to today's value at the default config", () => {
    const decls = declarations(css());
    for (const name of COMPOSITES) {
      const value = decls.get(`--${name}`);
      expect(value, name).toBeDefined();
      expect(resolve(value ?? '', decls)).toBe(TODAY[name]);
    }
  });

  it("moves --motion-fade-in's resolved value when --rafters-duration-fast changes", () => {
    const registry = new TokenRegistry(generateBaseSystem().allTokens, PLUGINS);
    registry.set('rafters-duration-fast', '180ms', { reason: 'designer: retune fast' });
    const decls = declarations(css(registry));
    expect(decls.get('--rafters-duration-fast')).toBe('180ms');
    expect(resolve(decls.get('--motion-fade-in') ?? '', decls)).toBe(
      '180ms cubic-bezier(0, 0, 0.2, 1)',
    );
  });
});
