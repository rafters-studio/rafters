/**
 * Registry Regeneration Tests
 *
 * Tests that verify the DAG-based automatic regeneration when dependencies change.
 * For semantic tokens with ColorReference values, the reference itself doesn't change -
 * but the exports reflect the updated underlying color values.
 */

import { COMPUTED, type ColorReference, type Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import { generateBaseSystem } from '../src/index.js';
import { TokenRegistry } from '../src/registry.js';

describe('Registry Regeneration', () => {
  describe('Semantic Token Dependencies', () => {
    it('semantic tokens have ColorReference values pointing to color families', () => {
      const result = generateBaseSystem();
      const registry = new TokenRegistry(result.allTokens);

      const destructive = registry.get('destructive');
      expect(destructive).toBeDefined();

      const value = destructive?.value as ColorReference;
      expect(value.family).toBe('silver-bold-fire-truck');
      expect(value.position).toBe('600');
    });

    it('changing a color family token updates exports', () => {
      const result = generateBaseSystem();
      const registry = new TokenRegistry(result.allTokens);

      // Get the base color token
      const originalColor = registry.get('silver-bold-fire-truck-600');
      expect(originalColor).toBeDefined();
      expect(typeof originalColor?.value).toBe('string');

      // Export before change
      const cssBefore = tokensToTailwind(registry.list());
      expect(cssBefore).toContain('--color-silver-bold-fire-truck-600:');

      // The destructive token references this color
      const destructive = registry.get('destructive');
      const destructiveRef = destructive?.value as ColorReference;
      expect(destructiveRef.family).toBe('silver-bold-fire-truck');
      expect(destructiveRef.position).toBe('600');
    });

    it('dependsOn arrays include family token and dark mode position', () => {
      const result = generateBaseSystem();
      const semanticTokens = result.allTokens.filter((t) => t.namespace === 'semantic');

      // dependsOn[0] = family token, dependsOn[1] = dark mode position token
      const destructive = semanticTokens.find((t) => t.name === 'destructive');
      expect(destructive?.dependsOn).toContain('silver-bold-fire-truck');
      expect(destructive?.dependsOn).toContain('silver-bold-fire-truck-500');

      const info = semanticTokens.find((t) => t.name === 'info');
      expect(info?.dependsOn).toContain('silver-true-sky');
      expect(info?.dependsOn).toContain('silver-true-sky-500');
    });
  });

  describe('Registry Dependency Graph', () => {
    it('registry exposes dependency graph methods', () => {
      const result = generateBaseSystem();
      const registry = new TokenRegistry(result.allTokens);

      // Registry should expose dependency graph methods
      expect(typeof registry.addDependency).toBe('function');
      expect(typeof registry.getDependents).toBe('function');
      expect(typeof registry.getDependencies).toBe('function');
      expect(typeof registry.getTopologicalOrder).toBe('function');
    });

    it('auto-populates dependency graph from token dependsOn/generationRule fields', () => {
      // Tokens with dependency info should auto-populate the graph
      const baseToken: Token = {
        name: 'spacing-base',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const derivedToken: Token = {
        name: 'spacing-4',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        dependsOn: ['spacing-base'],
        generationRule: 'calc({spacing-base}*4)',
      };

      // Create registry - should auto-populate graph
      const registry = new TokenRegistry([baseToken, derivedToken]);

      // Graph should be populated without manual addDependency call
      const dependents = registry.getDependents('spacing-base');
      expect(dependents).toContain('spacing-4');

      const dependencies = registry.getDependencies('spacing-4');
      expect(dependencies).toContain('spacing-base');
    });

    it('cascades changes through auto-populated graph', async () => {
      const baseToken: Token = {
        name: 'spacing-base',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const derivedToken: Token = {
        name: 'spacing-4',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        dependsOn: ['spacing-base'],
        generationRule: 'calc({spacing-base}*4)',
      };

      const registry = new TokenRegistry([baseToken, derivedToken]);

      // Change base - should cascade to derived
      await registry.set('spacing-base', '0.5rem');

      const updated = registry.get('spacing-4');
      // The calc plugin evaluates the expression to a numeric result with unit.
      // 0.5 * 4 = 2, unit = rem -> "2rem"
      expect(updated?.value).toBe('2rem');
    });

    it('spacing tokens regenerate when base changes', async () => {
      // Create minimal tokens for testing regeneration
      const baseToken: Token = {
        name: 'spacing-base',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const derivedToken: Token = {
        name: 'spacing-4',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        dependsOn: ['spacing-base'],
        generationRule: 'calc({spacing-base}*4)',
      };

      const registry = new TokenRegistry([baseToken, derivedToken]);

      // Add dependency to the graph
      registry.addDependencies([
        {
          tokenName: 'spacing-4',
          dependsOn: ['spacing-base'],
          rule: 'calc({spacing-base}*4)',
        },
      ]);

      // Check dependency is tracked
      const dependents = registry.getDependents('spacing-base');
      expect(dependents).toContain('spacing-4');
    });

    it('getDependents returns correct dependents for color tokens', () => {
      const result = generateBaseSystem();
      const registry = new TokenRegistry(result.allTokens);

      // Build dependencies from token dependsOn arrays
      const semanticTokens = result.allTokens.filter((t) => t.namespace === 'semantic');
      const dependencies = semanticTokens
        .filter((t) => t.dependsOn && t.dependsOn.length > 0)
        .map((t) => ({
          tokenName: t.name,
          dependsOn: t.dependsOn as string[],
          rule: t.generationRule || 'reference',
        }));

      registry.addDependencies(dependencies);

      // Check that destructive-related tokens depend on fire-truck color family
      const dependents = registry.getDependents('silver-bold-fire-truck');
      expect(dependents.length).toBeGreaterThan(0);
      expect(dependents).toContain('destructive');
    });
  });

  describe('User Override Respect', () => {
    it('regeneration skips tokens with userOverride but updates computedValue', async () => {
      // Create tokens with override
      const baseToken: Token = {
        name: 'secondary',
        value: 'oklch(0.5 0.1 200)',
        category: 'color',
        namespace: 'semantic',
      };

      const overriddenToken: Token = {
        name: 'secondary-ring',
        value: 'oklch(0.8 0.2 330)', // Pink - human chose this
        category: 'color',
        namespace: 'semantic',
        dependsOn: ['secondary'],
        generationRule: 'state:ring',
        userOverride: {
          previousValue: 'oklch(0.5 0.1 200)',
          reason: 'Brand team requested pink for Q1 campaign',
        },
      };

      const registry = new TokenRegistry([baseToken, overriddenToken]);

      // Add dependency tracking
      registry.addDependency('secondary-ring', ['secondary'], 'state:ring');

      // Get the token before any changes
      const beforeChange = registry.get('secondary-ring');
      expect(beforeChange?.value).toBe('oklch(0.8 0.2 330)'); // Pink
      expect(beforeChange?.userOverride?.reason).toBe('Brand team requested pink for Q1 campaign');
    });

    it('tokens without userOverride get their value updated', () => {
      const baseToken: Token = {
        name: 'spacing-base',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const derivedToken: Token = {
        name: 'spacing-4',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        dependsOn: ['spacing-base'],
        generationRule: 'calc({spacing-base}*4)',
        // No userOverride - this should be regenerated
      };

      const registry = new TokenRegistry([baseToken, derivedToken]);

      // No override means value should update on regeneration
      const token = registry.get('spacing-4');
      expect(token?.userOverride).toBeUndefined();
    });

    it('userOverride stores previousValue for undo and reason for agents', () => {
      const token: Token = {
        name: 'test-token',
        value: 'pink',
        category: 'color',
        namespace: 'semantic',
        userOverride: {
          previousValue: 'blue',
          reason: 'Accessibility audit found blue had insufficient contrast',
        },
        computedValue: 'blue',
      };

      const registry = new TokenRegistry([token]);
      const retrieved = registry.get('test-token');

      // Value is what human chose, previousValue enables undo
      expect(retrieved?.value).toBe('pink');
      expect(retrieved?.userOverride?.previousValue).toBe('blue');
      expect(retrieved?.userOverride?.reason).toContain('contrast');
    });

    it('clearOverride removes override and regenerates from rule (self-repair)', async () => {
      const baseToken: Token = {
        name: 'spacing-base',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const overriddenToken: Token = {
        name: 'spacing-4',
        value: '2rem', // Human override
        category: 'spacing',
        namespace: 'spacing',
        dependsOn: ['spacing-base'],
        generationRule: 'calc({spacing-base}*4)',
        userOverride: {
          previousValue: '1rem',
          reason: 'Design review wanted more spacing',
        },
      };

      const registry = new TokenRegistry([baseToken, overriddenToken]);
      registry.addDependency('spacing-4', ['spacing-base'], 'calc({spacing-base}*4)');

      // Before: has override
      const before = registry.get('spacing-4');
      expect(before?.value).toBe('2rem');
      expect(before?.userOverride).toBeDefined();

      // Clear override - triggers self-repair
      await registry.set('spacing-4', COMPUTED);

      // After: no override, value regenerated from rule
      const after = registry.get('spacing-4');
      expect(after?.userOverride).toBeUndefined();
      // The calc plugin evaluates: 0.25 * 4 = 1, unit = rem -> "1rem"
      expect(after?.value).toBe('1rem');
    });

    it('clearOverride is no-op when no override exists', async () => {
      const token: Token = {
        name: 'test',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
      };

      const registry = new TokenRegistry([token]);

      // Should not throw
      await registry.set('test', COMPUTED);

      const retrieved = registry.get('test');
      expect(retrieved?.value).toBe('1rem');
    });

    it('throws when setting COMPUTED on non-existent token', async () => {
      const registry = new TokenRegistry([]);

      await expect(registry.set('nonexistent', COMPUTED)).rejects.toThrow(
        'Token "nonexistent" does not exist',
      );
    });

    it('root token with override restores previousValue on COMPUTED', async () => {
      const rootToken: Token = {
        name: 'brand-color',
        value: 'pink', // Current override
        category: 'color',
        namespace: 'color',
        userOverride: {
          previousValue: 'blue', // Original value
          reason: 'Testing pink for campaign',
        },
      };

      const registry = new TokenRegistry([rootToken]);

      // Clear override on root token (no generation rule)
      await registry.set('brand-color', COMPUTED);

      const restored = registry.get('brand-color');
      expect(restored?.value).toBe('blue'); // Restored to previousValue
      expect(restored?.userOverride).toBeUndefined();
    });

    it('throws when clearing override on root token without previousValue', async () => {
      const rootToken: Token = {
        name: 'orphan',
        value: 'something',
        category: 'color',
        namespace: 'color',
        userOverride: {
          // @ts-expect-error Simulating invalid persisted token with missing previousValue
          previousValue: undefined,
          reason: 'Bad state',
        },
      };

      const registry = new TokenRegistry([rootToken]);

      await expect(registry.set('orphan', COMPUTED)).rejects.toThrow(
        'Cannot clear override for root token "orphan": no previousValue to restore',
      );
    });
  });

  describe('Export Consistency After Changes', () => {
    it('ColorReference values are resolved consistently across exports', () => {
      const result = generateBaseSystem();

      // Get destructive token
      const destructive = result.allTokens.find((t) => t.name === 'destructive');
      expect(destructive).toBeDefined();

      const ref = destructive?.value as ColorReference;
      expect(ref.family).toBe('silver-bold-fire-truck');
      expect(ref.position).toBe('600');

      // The export should reference the correct color
      const css = tokensToTailwind(result.allTokens);

      // Light mode: --rafters-destructive should reference silver-bold-fire-truck-600
      expect(css).toContain('--rafters-destructive: var(--color-silver-bold-fire-truck-600)');

      // Dark mode: --rafters-dark-destructive should reference silver-bold-fire-truck-500
      expect(css).toContain('--rafters-dark-destructive: var(--color-silver-bold-fire-truck-500)');
    });

    it('all semantic tokens export with correct color family references', () => {
      const result = generateBaseSystem();
      const css = tokensToTailwind(result.allTokens);

      // Success uses citrine
      expect(css).toContain('--rafters-success: var(--color-silver-true-citrine-600)');

      // Warning uses honey
      expect(css).toContain('--rafters-warning: var(--color-silver-true-honey-500)');

      // Info uses sky
      expect(css).toContain('--rafters-info: var(--color-silver-true-sky-600)');

      // Primary uses neutral
      expect(css).toContain('--rafters-primary: var(--color-neutral-900)');
    });
  });

  describe('setTokens batch updates', () => {
    it('updates multiple tokens in a single operation', async () => {
      const tokens: Token[] = [
        { name: 'color-a', value: 'oklch(0.5 0.1 200)', category: 'color', namespace: 'color' },
        { name: 'color-b', value: 'oklch(0.6 0.1 200)', category: 'color', namespace: 'color' },
        { name: 'color-c', value: 'oklch(0.7 0.1 200)', category: 'color', namespace: 'color' },
      ];

      const registry = new TokenRegistry(tokens);

      // Update all tokens at once
      await registry.setTokens([
        { ...tokens[0], value: 'oklch(0.8 0.2 250)' },
        { ...tokens[1], value: 'oklch(0.9 0.2 250)' },
        { ...tokens[2], value: 'oklch(0.95 0.2 250)' },
      ]);

      expect(registry.get('color-a')?.value).toBe('oklch(0.8 0.2 250)');
      expect(registry.get('color-b')?.value).toBe('oklch(0.9 0.2 250)');
      expect(registry.get('color-c')?.value).toBe('oklch(0.95 0.2 250)');
    });

    it('throws error if any token does not exist', async () => {
      const tokens: Token[] = [
        { name: 'existing', value: 'oklch(0.5 0.1 200)', category: 'color', namespace: 'color' },
      ];

      const registry = new TokenRegistry(tokens);

      await expect(
        registry.setTokens([
          { name: 'existing', value: 'updated', category: 'color', namespace: 'color' },
          { name: 'non-existent', value: 'value', category: 'color', namespace: 'color' },
        ]),
      ).rejects.toThrow('Token "non-existent" does not exist');
    });

    it('updates full token including metadata fields', async () => {
      const token: Token = {
        name: 'test-token',
        value: 'oklch(0.5 0.1 200)',
        category: 'color',
        namespace: 'color',
      };

      const registry = new TokenRegistry([token]);

      await registry.setTokens([
        {
          ...token,
          value: 'oklch(0.6 0.2 250)',
          description: 'Updated description',
          trustLevel: 'high',
        },
      ]);

      const updated = registry.get('test-token');
      expect(updated?.value).toBe('oklch(0.6 0.2 250)');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.trustLevel).toBe('high');
    });

    it('fires change callback for each token', async () => {
      const tokens: Token[] = [
        { name: 'token-1', value: 'a', category: 'color', namespace: 'color' },
        { name: 'token-2', value: 'b', category: 'color', namespace: 'color' },
      ];

      const registry = new TokenRegistry(tokens);
      const changes: string[] = [];

      registry.setChangeCallback((event) => {
        if (event.type === 'token-changed') {
          changes.push(event.tokenName);
        }
      });

      await registry.setTokens([
        { ...tokens[0], value: 'updated-a' },
        { ...tokens[1], value: 'updated-b' },
      ]);

      expect(changes).toContain('token-1');
      expect(changes).toContain('token-2');
    });

    it('handles empty array without error', async () => {
      const registry = new TokenRegistry([
        { name: 'test', value: 'value', category: 'color', namespace: 'color' },
      ]);

      await expect(registry.setTokens([])).resolves.toBeUndefined();
    });
  });
});
