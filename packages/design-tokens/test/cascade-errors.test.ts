/**
 * CascadeAggregateError tests
 *
 * Verifies that regenerateDependents throws a structured aggregate error by
 * default when any dependent's regeneration fails, and that the opt-in
 * continueOnCascadeErrors flag suppresses the throw.
 *
 * These tests do NOT fix any plugin -- they specifically exercise the error-
 * handling boundary added in #1237. Plugin contract correctness is covered
 * by #1232, #1229, and #1230.
 */

import type { Token } from '@rafters/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CascadeAggregateError, TokenRegistry } from '../src/registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal two-token registry: a base token and a dependent token
 * whose generationRule is intentionally bad so regenerateToken throws.
 *
 * The rule "scale:bad_rule_that_will_fail" is not a valid rule that the
 * executor knows, causing it to throw during cascade.
 */
function makeBrokenCascadeRegistry(): TokenRegistry {
  const base: Token = {
    name: 'base-color',
    value: 'oklch(0.5 0.1 200)',
    category: 'color',
    namespace: 'color',
  };

  // A valid generationRule is required for addDependency to register the
  // token in the graph. We use a calc rule but then manually point it at
  // base-color so the executor is called. The key is that when base-color
  // changes and the executor tries to run on 'derived-bad', it will fail
  // because the referenced token name doesn't exist as a proper scale token.
  //
  // To reliably produce a throw, we register a token with a rule that the
  // GenerationRuleExecutor will fail on: "state:ring" requires a ColorValue
  // with a scale, but base-color has a plain string value, so the executor
  // throws "cannot extract position from string token".
  const derived: Token = {
    name: 'derived-bad',
    value: 'oklch(0.6 0.1 200)',
    category: 'color',
    namespace: 'color',
    dependsOn: ['base-color'],
    generationRule: 'state:ring',
  };

  return new TokenRegistry([base, derived]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CascadeAggregateError', () => {
  it('is exported from the registry module', () => {
    expect(CascadeAggregateError).toBeDefined();
    expect(typeof CascadeAggregateError).toBe('function');
  });

  it('name is CascadeAggregateError', () => {
    const err = new CascadeAggregateError([{ dependentName: 'foo', error: new Error('boom') }]);
    expect(err.name).toBe('CascadeAggregateError');
  });

  it('message includes dependent token names', () => {
    const err = new CascadeAggregateError([
      { dependentName: 'primary-foreground', error: new Error('x') },
      { dependentName: 'accent-foreground', error: new Error('y') },
    ]);
    expect(err.message).toContain('"primary-foreground"');
    expect(err.message).toContain('"accent-foreground"');
  });

  it('errors array contains one entry per failing dependent', () => {
    const errors = [
      { dependentName: 'a', error: new Error('err-a') },
      { dependentName: 'b', error: new Error('err-b') },
    ];
    const aggregate = new CascadeAggregateError(errors);
    expect(aggregate.errors).toHaveLength(2);
    expect(aggregate.errors[0]?.dependentName).toBe('a');
    expect(aggregate.errors[1]?.dependentName).toBe('b');
  });

  it('is an instance of Error', () => {
    const err = new CascadeAggregateError([{ dependentName: 'x', error: new Error('z') }]);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('registry.set - cascade error handling', () => {
  let registry: TokenRegistry;

  beforeEach(() => {
    registry = makeBrokenCascadeRegistry();
  });

  it('throws CascadeAggregateError by default when a dependent regeneration fails', async () => {
    // Default behavior: loud fail
    await expect(registry.set('base-color', 'oklch(0.7 0.15 210)')).rejects.toThrow(
      CascadeAggregateError,
    );
  });

  it('thrown CascadeAggregateError identifies the failing dependent', async () => {
    let caught: unknown;
    try {
      await registry.set('base-color', 'oklch(0.7 0.15 210)');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(CascadeAggregateError);
    const agg = caught as CascadeAggregateError;
    expect(agg.errors.some((e) => e.dependentName === 'derived-bad')).toBe(true);
  });

  it('does NOT throw when continueOnCascadeErrors is true', async () => {
    // Opt-in graceful degrade: errors are collected and warned, not thrown
    await expect(
      registry.set('base-color', 'oklch(0.7 0.15 210)', { continueOnCascadeErrors: true }),
    ).resolves.toBeUndefined();
  });

  it('emits console.warn for each failure when continueOnCascadeErrors is true', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await registry.set('base-color', 'oklch(0.7 0.15 210)', { continueOnCascadeErrors: true });

    // Assert before restoring so mock.calls is still populated
    expect(warnSpy).toHaveBeenCalled();
    const calls = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((msg) => msg.includes('derived-bad'))).toBe(true);

    warnSpy.mockRestore();
  });

  it('base token value is still updated even when cascade throws', async () => {
    // The base token update happens before the cascade -- value IS written
    // even though the cascade aggregate error is then thrown.
    try {
      await registry.set('base-color', 'oklch(0.7 0.15 210)');
    } catch {
      // Expected
    }

    expect(registry.get('base-color')?.value).toBe('oklch(0.7 0.15 210)');
  });

  it('base token value is updated when continueOnCascadeErrors is true', async () => {
    await registry.set('base-color', 'oklch(0.9 0.05 100)', { continueOnCascadeErrors: true });
    expect(registry.get('base-color')?.value).toBe('oklch(0.9 0.05 100)');
  });
});

describe('registry.setToken - cascade error handling', () => {
  it('throws CascadeAggregateError by default when a dependent regeneration fails', async () => {
    const registry = makeBrokenCascadeRegistry();
    const baseToken = registry.get('base-color');
    if (!baseToken) throw new Error('base-color missing from registry');

    await expect(registry.setToken({ ...baseToken, value: 'oklch(0.8 0.2 180)' })).rejects.toThrow(
      CascadeAggregateError,
    );
  });

  it('does NOT throw when continueOnCascadeErrors is true', async () => {
    const registry = makeBrokenCascadeRegistry();
    const baseToken = registry.get('base-color');
    if (!baseToken) throw new Error('base-color missing from registry');

    await expect(
      registry.setToken(
        { ...baseToken, value: 'oklch(0.8 0.2 180)' },
        { continueOnCascadeErrors: true },
      ),
    ).resolves.toBeUndefined();
  });
});

describe('registry.setTokens - cascade error handling', () => {
  it('throws CascadeAggregateError by default when a dependent regeneration fails', async () => {
    const registry = makeBrokenCascadeRegistry();
    const baseToken = registry.get('base-color');
    if (!baseToken) throw new Error('base-color missing from registry');

    await expect(
      registry.setTokens([{ ...baseToken, value: 'oklch(0.8 0.2 180)' }]),
    ).rejects.toThrow(CascadeAggregateError);
  });

  it('does NOT throw when continueOnCascadeErrors is true', async () => {
    const registry = makeBrokenCascadeRegistry();
    const baseToken = registry.get('base-color');
    if (!baseToken) throw new Error('base-color missing from registry');

    await expect(
      registry.setTokens([{ ...baseToken, value: 'oklch(0.8 0.2 180)' }], {
        continueOnCascadeErrors: true,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('registry - cascade succeeds without errors', () => {
  it('set() does not throw when all dependents regenerate successfully', async () => {
    const base: Token = {
      name: 'spacing-base',
      value: '0.25rem',
      category: 'spacing',
      namespace: 'spacing',
    };

    const derived: Token = {
      name: 'spacing-4',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
      dependsOn: ['spacing-base'],
      generationRule: 'calc({spacing-base}*4)',
    };

    const registry = new TokenRegistry([base, derived]);

    // No cascade errors expected here -- calc rule works fine
    await expect(registry.set('spacing-base', '0.5rem')).resolves.toBeUndefined();
    expect(registry.get('spacing-4')?.value).toBe('calc(0.5rem*4)');
  });
});
