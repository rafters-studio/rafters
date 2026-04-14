/**
 * Plugin protocol tests (#1243)
 *
 * Covers:
 * - regenerate: happy path per rule type
 * - regenerate: throws on input.parse failure ("rule does not apply")
 * - cascade: collects multiple failures and throws an aggregate error
 * - applyComputed: fires the change event and does not re-cascade
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { ColorReferenceSchema } from '@rafters/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cascade, clearPlugins, regenerate, registerPlugin } from '../src/plugins';
import { TokenRegistry } from '../src/registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOKLCH(l: number, c: number, h: number): OKLCH {
  return { l, c, h, alpha: 1 };
}

function makeColorValue(name: string, baseH: number): ColorValue {
  const positions = [0.98, 0.95, 0.9, 0.8, 0.7, 0.55, 0.4, 0.25, 0.15, 0.08, 0.04];
  return {
    name,
    scale: positions.map((l) => makeOKLCH(l, 0.15, baseH)),
    accessibility: {
      wcagAAA: {
        normal: [
          [0, 10],
          [1, 9],
          [2, 8],
        ],
        large: [],
      },
      wcagAA: {
        normal: [
          [0, 7],
          [1, 8],
          [3, 9],
        ],
        large: [],
      },
      onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5 },
      onBlack: { wcagAA: true, wcagAAA: false, contrastRatio: 5 },
    },
  };
}

function makeRegistry(): TokenRegistry {
  const registry = new TokenRegistry();
  const cv = makeColorValue('test-blue', 240);

  registry.add({ name: 'test-family', value: cv, category: 'color', namespace: 'color' });
  registry.add({
    name: 'test-family-500',
    value: 'oklch(0.550 0.150 240)',
    category: 'color',
    namespace: 'color',
    dependsOn: ['test-family'],
    generationRule: 'scale:500',
  });
  registry.addDependency('test-family-500', ['test-family'], 'scale:500');

  return registry;
}

// ---------------------------------------------------------------------------
// regenerate: happy path per rule type
// ---------------------------------------------------------------------------

describe('regenerate: happy paths', () => {
  it('scale-position: regenerates CSS string for a position token', async () => {
    const registry = makeRegistry();
    const cv = makeColorValue('test-blue', 240);
    const expected500 = cv.scale[5];

    await regenerate(registry, 'test-family-500');

    const token = registry.get('test-family-500');
    expect(token?.value).toBeDefined();
    // After regeneration the value is a CSS oklch() string
    expect(typeof token?.value).toBe('string');
    expect(String(token?.value)).toMatch(/^oklch\(/);
    if (expected500) {
      expect(String(token?.value)).toContain(expected500.l.toFixed(3));
    }
  });

  it('scale-position: resolves a ColorReference for a semantic (ref-valued) token', async () => {
    const registry = new TokenRegistry();
    const cv = makeColorValue('primary-family', 240);

    registry.add({ name: 'primary-family', value: cv, category: 'color', namespace: 'color' });
    registry.add({
      name: 'primary',
      // semantic token has a ColorReference as its value
      value: { family: 'primary-family', position: '500' },
      category: 'color',
      namespace: 'semantic',
      dependsOn: ['primary-family'],
      generationRule: 'scale:500',
    });
    registry.addDependency('primary', ['primary-family'], 'scale:500');

    await regenerate(registry, 'primary');

    const token = registry.get('primary');
    expect(token?.value).toBeDefined();
    const parsed = ColorReferenceSchema.safeParse(token?.value);
    expect(parsed.success, 'primary value should be ColorReference').toBe(true);
  });

  it('contrast: regenerates a ColorReference for a foreground token', async () => {
    const registry = new TokenRegistry();
    const cv = makeColorValue('primary-family', 240);

    registry.add({ name: 'primary-family', value: cv, category: 'color', namespace: 'color' });
    registry.add({
      name: 'primary-foreground',
      value: { family: 'primary-family', position: '50' },
      category: 'color',
      namespace: 'semantic',
      dependsOn: ['primary-family'],
      generationRule: 'contrast:auto',
    });
    registry.addDependency('primary-foreground', ['primary-family'], 'contrast:auto');

    await regenerate(registry, 'primary-foreground');

    const token = registry.get('primary-foreground');
    const parsed = ColorReferenceSchema.safeParse(token?.value);
    expect(parsed.success, 'primary-foreground should be ColorReference').toBe(true);
  });

  it('state: regenerates a ColorReference for a hover token', async () => {
    const registry = new TokenRegistry();
    const cv = makeColorValue('primary-family', 240);

    registry.add({ name: 'primary-family', value: cv, category: 'color', namespace: 'color' });
    registry.add({
      name: 'primary',
      value: { family: 'primary-family', position: '500' },
      category: 'color',
      namespace: 'semantic',
    });
    registry.add({
      name: 'primary-hover',
      value: { family: 'primary-family', position: '600' },
      category: 'color',
      namespace: 'semantic',
      dependsOn: ['primary-family'],
      generationRule: 'state:hover',
    });
    registry.addDependency('primary-hover', ['primary-family'], 'state:hover');

    await regenerate(registry, 'primary-hover');

    const token = registry.get('primary-hover');
    const parsed = ColorReferenceSchema.safeParse(token?.value);
    expect(parsed.success, 'primary-hover should be ColorReference').toBe(true);
  });

  it('invert: regenerates a ColorReference with WCAG-safe dark index', async () => {
    const registry = new TokenRegistry();
    const cv = makeColorValue('primary-family', 240);

    registry.add({ name: 'primary-family', value: cv, category: 'color', namespace: 'color' });
    // The invert resolver uses dependency[1] to find the light position.
    // Add a position token as dep[1] so it can be found.
    registry.add({
      name: 'primary-family-50',
      value: 'oklch(0.980 0.150 240)',
      category: 'color',
      namespace: 'color',
    });
    registry.add({
      name: 'primary-dark-50',
      value: { family: 'primary-family', position: '950' },
      category: 'color',
      namespace: 'semantic',
      dependsOn: ['primary-family', 'primary-family-50'],
      generationRule: 'invert',
    });
    registry.addDependency('primary-dark-50', ['primary-family', 'primary-family-50'], 'invert');

    await regenerate(registry, 'primary-dark-50');

    const token = registry.get('primary-dark-50');
    const parsed = ColorReferenceSchema.safeParse(token?.value);
    expect(parsed.success, 'primary-dark-50 should be ColorReference').toBe(true);
  });

  it('calc: evaluates expression and produces a CSS string with unit', async () => {
    const registry = new TokenRegistry();

    registry.add({
      name: 'spacing-base',
      value: '0.25rem',
      category: 'spacing',
      namespace: 'spacing',
    });
    registry.add({
      name: 'spacing-4',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['spacing-base'],
      generationRule: 'calc({spacing-base}*4)',
    });
    registry.addDependency('spacing-4', ['spacing-base'], 'calc({spacing-base}*4)');

    await regenerate(registry, 'spacing-4');

    const token = registry.get('spacing-4');
    expect(typeof token?.value).toBe('string');
    // 0.25 * 4 = 1, unit = rem
    expect(token?.value).toBe('1rem');
  });
});

// ---------------------------------------------------------------------------
// regenerate: input parse failure surfaces as ZodError
// ---------------------------------------------------------------------------

describe('regenerate: input.parse failure = rule does not apply', () => {
  afterEach(() => {
    clearPlugins();
  });

  it('throws when the plugin is not registered for the rule type', async () => {
    // clearPlugins was called in afterEach of a previous test.
    // Register only the strict-test plugin (no builtins).
    registerPlugin({
      id: 'strict-test',
      input: z.object({ requiredField: z.string() }),
      output: z.string(),
      transform: (input) => input.requiredField,
    });

    const registry = new TokenRegistry();
    registry.add({ name: 'dep-token', value: '1', category: 'spacing', namespace: 'spacing' });
    registry.add({
      name: 'test-token',
      value: 'placeholder',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['dep-token'],
      generationRule: 'unknown-rule-type',
    });
    // Must register in dependency graph for getGenerationRule to return the rule
    registry.addDependency('test-token', ['dep-token'], 'unknown-rule-type');

    // No plugin registered for "unknown-rule-type" -> resolveInput throws
    await expect(regenerate(registry, 'test-token')).rejects.toThrow();
  });

  it('throws ZodError when resolveInput returns struct that fails plugin input schema', async () => {
    // Use the calc rule: if expression is empty the plugin input will parse fine
    // but transform will fail. Instead use a custom plugin that requires a field
    // that the input struct from resolveInput won't provide.
    // We inject a custom plugin for "calc" that requires an extra field.
    clearPlugins();
    registerPlugin({
      id: 'calc',
      input: z.object({
        expression: z.string(),
        tokenValues: z.record(z.string(), z.string()),
        extraRequired: z.number(),
      }),
      output: z.string(),
      transform: (input) => String(input.extraRequired),
    });

    const registry = new TokenRegistry();
    registry.add({
      name: 'spacing-base',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
    });
    registry.add({
      name: 'spacing-4',
      value: '4rem',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['spacing-base'],
      generationRule: 'calc({spacing-base}*4)',
    });
    registry.addDependency('spacing-4', ['spacing-base'], 'calc({spacing-base}*4)');

    // input.parse will throw ZodError because extraRequired is missing
    await expect(regenerate(registry, 'spacing-4')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// cascade: aggregate error
// ---------------------------------------------------------------------------

describe('cascade: aggregate error', () => {
  it('throws aggregate error when any dependent fails to regenerate', async () => {
    const registry = new TokenRegistry();
    const cv = makeColorValue('test-blue', 240);

    // Add family token
    registry.add({ name: 'test-family', value: cv, category: 'color', namespace: 'color' });

    // Add two position tokens that will regenerate successfully
    registry.add({
      name: 'test-family-500',
      value: 'oklch(0.550 0.150 240)',
      category: 'color',
      namespace: 'color',
      dependsOn: ['test-family'],
      generationRule: 'scale:500',
    });
    registry.add({
      name: 'test-family-700',
      value: 'oklch(0.250 0.150 240)',
      category: 'color',
      namespace: 'color',
      dependsOn: ['test-family'],
      generationRule: 'scale:700',
    });
    registry.addDependency('test-family-500', ['test-family'], 'scale:500');
    registry.addDependency('test-family-700', ['test-family'], 'scale:700');

    // Register a broken plugin to simulate a cascade failure
    clearPlugins();
    registerPlugin({
      id: 'scale-position',
      input: z.object({
        familyColorValue: z.unknown(),
        familyName: z.string(),
        scalePosition: z.number(),
      }),
      output: z.object({ family: z.string(), position: z.string() }),
      transform: () => {
        throw new Error('simulated cascade node failure');
      },
    });

    const err = await cascade(registry, 'test-family').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('cascade failed');
    const cause = (err as Error & { cause: unknown }).cause as {
      code: string;
      failures: Array<{ tokenName: string; cause: unknown }>;
    };
    expect(cause.code).toBe('cascade-aggregate');
    expect(Array.isArray(cause.failures)).toBe(true);
    expect(cause.failures.length).toBeGreaterThan(0);
    for (const failure of cause.failures) {
      expect(typeof failure.tokenName).toBe('string');
      expect(failure.cause).toBeDefined();
    }
  });

  it('includes all failed tokens in cause.failures', async () => {
    const registry = new TokenRegistry();
    registry.add({ name: 'root', value: '1', category: 'spacing', namespace: 'spacing' });
    registry.add({
      name: 'dep-a',
      value: '2',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['root'],
      generationRule: 'will-fail',
    });
    registry.add({
      name: 'dep-b',
      value: '3',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['root'],
      generationRule: 'will-fail',
    });
    registry.addDependency('dep-a', ['root'], 'will-fail');
    registry.addDependency('dep-b', ['root'], 'will-fail');

    clearPlugins();
    registerPlugin({
      id: 'will-fail',
      input: z.object({}),
      output: z.string(),
      transform: () => {
        throw new Error('intentional failure');
      },
    });

    const err = await cascade(registry, 'root').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    const cause = (err as Error & { cause: unknown }).cause as {
      code: string;
      failures: Array<{ tokenName: string; cause: unknown }>;
    };
    expect(cause.code).toBe('cascade-aggregate');
    const failedNames = cause.failures.map((f) => f.tokenName);
    expect(failedNames).toContain('dep-a');
    expect(failedNames).toContain('dep-b');
  });
});

// ---------------------------------------------------------------------------
// applyComputed: fires change event, does not re-cascade
// ---------------------------------------------------------------------------

describe('applyComputed: fires event, no re-cascade', () => {
  it('fires the change event when applyComputed is called', async () => {
    const registry = new TokenRegistry();
    registry.add({
      name: 'my-token',
      value: 'old-value',
      category: 'spacing',
      namespace: 'spacing',
    });

    const events: Array<{ tokenName: string; newValue: unknown }> = [];
    registry.setChangeCallback((event) => {
      if (event.type === 'token-changed') {
        events.push({ tokenName: event.tokenName, newValue: event.newValue });
      }
    });

    await registry.applyComputed('my-token', 'new-value');

    expect(events.length).toBe(1);
    expect(events[0]?.tokenName).toBe('my-token');
    expect(events[0]?.newValue).toBe('new-value');
  });

  it('does not cascade (no dependent regeneration) when applyComputed is called', async () => {
    const registry = new TokenRegistry();
    registry.add({ name: 'parent', value: '1rem', category: 'spacing', namespace: 'spacing' });
    registry.add({
      name: 'child',
      value: '2rem',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['parent'],
      generationRule: 'calc({parent}*2)',
    });
    registry.addDependency('child', ['parent'], 'calc({parent}*2)');

    // applyComputed on parent should NOT trigger child regeneration
    await registry.applyComputed('parent', '1.5rem');

    // Child value should remain unchanged
    expect(registry.get('child')?.value).toBe('2rem');
  });

  it('updates computedValue only when token has userOverride', async () => {
    const registry = new TokenRegistry();
    registry.add({
      name: 'my-token',
      value: 'manual-override',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: {
        previousValue: 'old-computed',
        reason: 'designer override',
      },
    });

    await registry.applyComputed('my-token', 'new-computed');

    const token = registry.get('my-token');
    // value should remain the manual override
    expect(token?.value).toBe('manual-override');
    // computedValue should reflect what the system produced
    expect(token?.computedValue).toBe('new-computed');
  });

  it('updates both value and computedValue when no userOverride', async () => {
    const registry = new TokenRegistry();
    registry.add({
      name: 'clean-token',
      value: 'old',
      category: 'spacing',
      namespace: 'spacing',
      userOverride: null,
    });

    await registry.applyComputed('clean-token', 'new');

    const token = registry.get('clean-token');
    expect(token?.value).toBe('new');
    expect(token?.computedValue).toBe('new');
  });
});
