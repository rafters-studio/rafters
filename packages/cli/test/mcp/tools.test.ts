import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CONSUMER_QUICKSTART,
  RaftersToolHandler,
  SYSTEM_PREAMBLE,
  TOOL_DEFINITIONS,
} from '../../src/mcp/tools.js';
import { fixtures, serializeNamespaceFile } from '../fixtures/tokens.js';

describe('TOOL_DEFINITIONS', () => {
  it('should define 6 design-focused tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(6);
  });

  it('should have correct tool names', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('rafters_vocabulary');
    expect(names).toContain('rafters_pattern');
    expect(names).toContain('rafters_component');
    expect(names).toContain('rafters_token');
    expect(names).toContain('rafters_cognitive_budget');
  });

  it('should have descriptions for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('should have input schemas for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('SYSTEM_PREAMBLE', () => {
  it('should contain key rules', () => {
    expect(SYSTEM_PREAMBLE).toContain('RAFTERS IS NOT SHADCN');
    expect(SYSTEM_PREAMBLE).toContain('CLASSY IS THE LAW');
    expect(SYSTEM_PREAMBLE).toContain('LAYOUT IS SOLVED');
    expect(SYSTEM_PREAMBLE).toContain('CONTAINER OWNS SPACING');
    expect(SYSTEM_PREAMBLE).toContain('COMPONENTS ARE COMPLETE');
  });

  it('should contain color token guidance', () => {
    expect(SYSTEM_PREAMBLE).toContain('COLORS ARE TAILWIND CLASSES');
    expect(SYSTEM_PREAMBLE).toContain('Palette families are internal');
    expect(SYSTEM_PREAMBLE).toContain('quickstart.colorTokens');
  });
});

describe('CONSUMER_QUICKSTART', () => {
  it('should contain onboarding rules', () => {
    expect(CONSUMER_QUICKSTART.rule1).toContain('pre-styled');
    expect(CONSUMER_QUICKSTART.rule2).toContain('Tailwind classes');
    expect(CONSUMER_QUICKSTART.rule3).toContain('Container and Grid');
  });

  it('should list anti-patterns', () => {
    expect(CONSUMER_QUICKSTART.antiPatterns.length).toBeGreaterThanOrEqual(4);
    const joined = CONSUMER_QUICKSTART.antiPatterns.join(' ');
    expect(joined).toContain('palette families');
    expect(joined).toContain('className');
    expect(joined).toContain('color mapping');
  });

  it('should include semantic color tokens', () => {
    const semanticJoined = CONSUMER_QUICKSTART.colorTokens.semantic.join(' ');
    expect(semanticJoined).toContain('primary');
    expect(semanticJoined).toContain('destructive');
    expect(semanticJoined).toContain('success');
    expect(semanticJoined).toContain('warning');
    expect(semanticJoined).toContain('info');
  });

  it('should include categorical and structural tokens', () => {
    expect(CONSUMER_QUICKSTART.colorTokens.categorical).toContain('chart-1');
    expect(CONSUMER_QUICKSTART.colorTokens.structural).toContain('card');
    expect(CONSUMER_QUICKSTART.colorTokens.structural).toContain('border');
  });
});

describe('RaftersToolHandler with null project root', () => {
  const nullHandler = new RaftersToolHandler(null);

  it('should return error for project-dependent tools', async () => {
    for (const tool of [
      'rafters_vocabulary',
      'rafters_component',
      'rafters_token',
      'rafters_cognitive_budget',
    ]) {
      const result = await nullHandler.handleToolCall(tool, {
        name: 'button',
        components: ['button'],
        tier: 'page',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('pnpm dlx rafters init');
    }
  });

  it('should allow rafters_pattern without a project root', async () => {
    const result = await nullHandler.handleToolCall('rafters_pattern', {
      pattern: 'destructive-action',
    });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data.name).toBe('Destructive Action');
  });
});

describe('RaftersToolHandler', () => {
  const testDir = join(tmpdir(), 'rafters-test-mcp-tools');
  let handler: RaftersToolHandler;

  beforeEach(async () => {
    await mkdir(join(testDir, '.rafters', 'tokens'), { recursive: true });
    handler = new RaftersToolHandler(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('rafters_vocabulary', () => {
    it('should return vocabulary structure with system preamble', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);

      const data = JSON.parse(result.content[0].text as string);
      expect(data.system).toContain('RAFTERS IS NOT SHADCN');
      expect(data.system).toContain('CLASSY IS THE LAW');
      expect(data.colors).toBeDefined();
      expect(data.spacing).toBeDefined();
      expect(data.typography).toBeDefined();
      expect(data.components).toBeDefined();
      expect(data.components.installed).toBeDefined();
      expect(data.components.available).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(Array.isArray(data.patterns)).toBe(true);
    });

    it('should return empty installed when no config exists', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(data.components.installed).toEqual([]);
    });

    it('should return installed components from config', async () => {
      await writeFile(
        join(testDir, '.rafters', 'config.rafters.json'),
        JSON.stringify({
          framework: 'react-router',
          componentsPath: 'components/ui',
          primitivesPath: 'lib/primitives',
          compositesPath: 'composites',
          cssPath: null,
          shadcn: false,
          exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
          installed: {
            components: ['button', 'card'],
            primitives: ['classy'],
          },
        }),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(data.components.installed).toEqual(['button', 'card']);
    });

    it('should exclude installed from available', async () => {
      await writeFile(
        join(testDir, '.rafters', 'config.rafters.json'),
        JSON.stringify({
          framework: 'react-router',
          componentsPath: 'components/ui',
          primitivesPath: 'lib/primitives',
          compositesPath: 'composites',
          cssPath: null,
          shadcn: false,
          exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
          installed: {
            components: ['button', 'card'],
            primitives: ['classy'],
          },
        }),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      // Available should not contain installed components
      expect(data.components.available).not.toContain('button');
      expect(data.components.available).not.toContain('card');
    });

    it('should include quickstart in vocabulary response', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(data.quickstart).toBeDefined();
      expect(data.quickstart.rule1).toContain('pre-styled');
      expect(data.quickstart.antiPatterns).toBeDefined();
      expect(data.quickstart.colorTokens).toBeDefined();
    });

    it('should always include semantic color tokens even without token files', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(data.colors.semantic).toContain('primary');
      expect(data.colors.semantic).toContain('destructive');
      expect(data.colors.semantic).toContain('success');
      expect(data.colors.semantic).toContain('warning');
      expect(data.colors.semantic).toContain('info');
      expect(data.colors.semantic).toContain('chart-1');
      expect(data.colors.semantic).toContain('chart-5');
      expect(data.colors.usage).toContain('Tailwind');
    });

    it('should merge dynamic tokens with static known tokens', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
        serializeNamespaceFile('color', [fixtures.primaryToken()]),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      // Dynamic token present
      expect(data.colors.semantic).toContain('primary');
      // Static tokens also present alongside dynamic
      expect(data.colors.semantic).toContain('chart-1');
      expect(data.colors.semantic).toContain('success');
      expect(data.colors.semantic).toContain('destructive');
      // No duplicates
      const primaryCount = data.colors.semantic.filter((s: string) => s === 'primary').length;
      expect(primaryCount).toBe(1);
    });

    it('should include all semantic token variants from design-tokens defaults', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      // Should include extended variants (hover, active, subtle, etc.)
      expect(data.colors.semantic).toContain('primary-hover');
      expect(data.colors.semantic).toContain('primary-subtle');
      expect(data.colors.semantic).toContain('destructive-foreground');
      expect(data.colors.semantic).toContain('success-border');
    });

    it('should include spacing fallback when no token files exist', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(Object.keys(data.spacing.scale).length).toBeGreaterThan(0);
      expect(data.spacing.usage).toContain('Container');
    });

    it('should include typography fallback when no token files exist', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(Object.keys(data.typography.sizes).length).toBeGreaterThan(0);
      expect(data.typography.weights.length).toBeGreaterThan(0);
      expect(data.typography.usage).toContain('Typography components');
    });

    it('should return color vocabulary when tokens exist', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
        serializeNamespaceFile('color', [fixtures.primaryToken()]),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.colors.semantic).toContain('primary');
    });

    it('should return spacing vocabulary when tokens exist', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
        serializeNamespaceFile('spacing', [fixtures.spacing1Token()]),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.spacing.scale).toBeDefined();
      expect(data.spacing.scale['spacing-1']).toBe('0.25rem');
    });

    it('should include available patterns', async () => {
      const result = await handler.handleToolCall('rafters_vocabulary', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.patterns).toContain('destructive-action');
      expect(data.patterns).toContain('form-validation');
      expect(data.patterns).toContain('empty-state');
    });

    it('should handle config without installed field', async () => {
      await writeFile(
        join(testDir, '.rafters', 'config.rafters.json'),
        JSON.stringify({
          framework: 'react-router',
          componentsPath: 'components/ui',
          primitivesPath: 'lib/primitives',
          compositesPath: 'composites',
          cssPath: null,
          shadcn: false,
          exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
        }),
      );

      const result = await handler.handleToolCall('rafters_vocabulary', {});
      const data = JSON.parse(result.content[0].text as string);

      expect(data.components.installed).toEqual([]);
    });
  });

  describe('rafters_pattern', () => {
    it('should return pattern details for valid pattern', async () => {
      const result = await handler.handleToolCall('rafters_pattern', {
        pattern: 'destructive-action',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('Destructive Action');
      expect(data.intent).toBeDefined();
      expect(data.components).toContain('alert-dialog');
      expect(data.components).toContain('button');
      expect(data.tokens.colors).toContain('destructive');
      expect(data.accessibility).toBeDefined();
      expect(data.trustPattern).toBeDefined();
      expect(data.guidance.do).toBeDefined();
      expect(data.guidance.never).toBeDefined();
    });

    it('should return pattern with example code', async () => {
      const result = await handler.handleToolCall('rafters_pattern', {
        pattern: 'destructive-action',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.example).toContain('AlertDialog');
    });

    it('should return error for unknown pattern', async () => {
      const result = await handler.handleToolCall('rafters_pattern', {
        pattern: 'nonexistent-pattern',
      });

      expect(result.isError).toBe(true);

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.available).toContain('destructive-action');
    });

    it('should return form-validation pattern', async () => {
      const result = await handler.handleToolCall('rafters_pattern', {
        pattern: 'form-validation',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('Form Validation');
      expect(data.components).toContain('field');
      expect(data.components).toContain('input');
    });
  });

  describe('rafters_component', () => {
    it('should return error for non-existent component', async () => {
      const result = await handler.handleToolCall('rafters_component', {
        name: 'nonexistent',
      });

      expect(result.isError).toBe(true);

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.suggestion).toContain('rafters_vocabulary');
    });

    /** Write a .tsx file into the test components directory */
    async function writeTestComponent(name: string, source: string): Promise<void> {
      const componentsDir = join(testDir, 'packages/ui/src/components/ui');
      await mkdir(componentsDir, { recursive: true });
      await writeFile(join(componentsDir, `${name}.tsx`), source);
    }

    it('should return jsDocDependencies with runtime deps from @dependencies', async () => {
      await writeTestComponent(
        'test-comp',
        `/**
 * Test component
 * @cognitive-load 3/10
 * @dependencies nanostores@^0.11.0
 * @devDependencies
 * @internal-dependencies @rafters/color-utils
 */
export function TestComp() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'test-comp',
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.jsDocDependencies).toBeDefined();
      expect(data.jsDocDependencies.runtime).toEqual(['nanostores@^0.11.0']);
      expect(data.jsDocDependencies.dev).toEqual([]);
      expect(data.jsDocDependencies.internal).toEqual(['@rafters/color-utils']);
    });

    it('should omit jsDocDependencies when no dep tags present', async () => {
      await writeTestComponent(
        'plain-comp',
        `/**
 * Plain component without dep tags
 * @cognitive-load 2/10
 */
export function PlainComp() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'plain-comp',
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.jsDocDependencies).toBeUndefined();
    });

    it('should parse multiple runtime dependencies', async () => {
      await writeTestComponent(
        'multi-dep',
        `/**
 * Multi-dep component
 * @dependencies nanostores@^0.11.0 zustand@^4.0.0
 */
export function MultiDep() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'multi-dep',
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.jsDocDependencies).toBeDefined();
      expect(data.jsDocDependencies.runtime).toEqual(['nanostores@^0.11.0', 'zustand@^4.0.0']);
    });

    it('should read components from config-specified path', async () => {
      // Write config with a consumer-style componentsPath
      await writeFile(
        join(testDir, '.rafters', 'config.rafters.json'),
        JSON.stringify({
          framework: 'vite',
          componentsPath: 'src/components/ui',
          primitivesPath: 'src/lib/primitives',
          compositesPath: 'src/composites',
          cssPath: null,
          shadcn: false,
          exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
        }),
      );

      // Write component at the config-specified path (NOT the monorepo fallback)
      const consumerDir = join(testDir, 'src/components/ui');
      await mkdir(consumerDir, { recursive: true });
      await writeFile(
        join(consumerDir, 'my-button.tsx'),
        `/**
 * A custom button
 * @cognitive-load 2/10
 */
export function MyButton() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'my-button',
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('my-button');
      expect(data.displayName).toBe('My Button');
    });

    it('should fall back to monorepo path when no config exists', async () => {
      // No config file written -- should use packages/ui/src/components/ui
      const monorepoDir = join(testDir, 'packages/ui/src/components/ui');
      await mkdir(monorepoDir, { recursive: true });
      await writeFile(
        join(monorepoDir, 'fallback-comp.tsx'),
        `/**
 * Fallback component
 * @cognitive-load 1/10
 */
export function FallbackComp() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'fallback-comp',
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('fallback-comp');
    });

    it('should not find component at monorepo path when config specifies different path', async () => {
      // Write config pointing to src/components/ui
      await writeFile(
        join(testDir, '.rafters', 'config.rafters.json'),
        JSON.stringify({
          framework: 'vite',
          componentsPath: 'src/components/ui',
          primitivesPath: 'src/lib/primitives',
          compositesPath: 'src/composites',
          cssPath: null,
          shadcn: false,
          exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
        }),
      );

      // Write component ONLY at the monorepo path (wrong location for consumer)
      const monorepoDir = join(testDir, 'packages/ui/src/components/ui');
      await mkdir(monorepoDir, { recursive: true });
      await writeFile(
        join(monorepoDir, 'wrong-place.tsx'),
        `/** @cognitive-load 1/10 */
export function WrongPlace() { return null; }`,
      );

      const result = await handler.handleToolCall('rafters_component', {
        name: 'wrong-place',
      });

      // Should NOT find it because config says to look in src/components/ui
      expect(result.isError).toBe(true);
    });
  });

  describe('rafters_token', () => {
    it('should return error for non-existent token', async () => {
      const result = await handler.handleToolCall('rafters_token', {
        name: 'nonexistent-token',
      });

      expect(result.isError).toBe(true);

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.suggestion).toContain('rafters_vocabulary');
    });

    it('should return token details for existing spacing token', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
        serializeNamespaceFile('spacing', [fixtures.spacing1Token()]),
      );

      const result = await handler.handleToolCall('rafters_token', {
        name: 'spacing-1',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('spacing-1');
      expect(data.namespace).toBe('spacing');
      expect(data.value).toBe('0.25rem');
      expect(data.isOverridden).toBe(false);
    });

    it('should return derivation information for tokens with rules', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
        serializeNamespaceFile('spacing', [fixtures.spacingWithRuleToken()]),
      );

      const result = await handler.handleToolCall('rafters_token', {
        name: 'spacing-6',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('spacing-6');
      expect(data.derivation).toBeDefined();
      expect(data.derivation.rule).toBe('calc({spacing-base} * 6)');
      expect(data.derivation.progressionSystem).toBe('minor-third');
      expect(data.dependsOn).toContain('spacing-base');
      expect(data.semanticMeaning).toBeDefined();
      expect(data.usageContext).toBeDefined();
    });

    it('should return override context for human-overridden tokens', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
        serializeNamespaceFile('spacing', [fixtures.overriddenToken()]),
      );

      const result = await handler.handleToolCall('rafters_token', {
        name: 'spacing-custom',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('spacing-custom');
      expect(data.value).toBe('2rem');
      expect(data.computedValue).toBe('1.75rem');
      expect(data.isOverridden).toBe(true);
      expect(data.override).toBeDefined();
      expect(data.override.previousValue).toBe('1.75rem');
      expect(data.override.reason).toContain('Design review');
    });

    it('should suggest similar tokens when token not found', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
        serializeNamespaceFile('spacing', [
          fixtures.spacing1Token(),
          fixtures.spacingWithRuleToken(),
        ]),
      );

      const result = await handler.handleToolCall('rafters_token', {
        name: 'spacing-99',
      });

      expect(result.isError).toBe(true);

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.similar).toBeDefined();
      expect(data.similar.length).toBeGreaterThan(0);
    });

    it('should return color token details', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
        serializeNamespaceFile('color', [fixtures.primaryToken()]),
      );

      const result = await handler.handleToolCall('rafters_token', {
        name: 'primary',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.name).toBe('primary');
      expect(data.namespace).toBe('color');
      expect(data.semanticMeaning).toContain('Primary');
    });
  });

  describe('rafters_cognitive_budget', () => {
    it('should return composition review for valid components', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: ['button', 'card', 'input'],
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse(result.content[0].text as string);
      expect(data.budget).toBeDefined();
      expect(data.budget.tier).toBe('page');
      expect(data.budget.status).toBe('within-budget');
      expect(data.budget.total).toBeGreaterThan(0);
      expect(data.components).toBeDefined();
      expect(data.components.length).toBeGreaterThan(0);
      expect(data.attention).toBeDefined();
      expect(data.trust).toBeDefined();
      expect(data.patterns).toBeDefined();
      expect(data.hotspots).toBeDefined();
      expect(data.violations).toBeDefined();
      expect(data.warnings).toBeDefined();
      // Components are in test dir (not monorepo), so intelligence is unavailable
      expect(data.warnings.length).toBeGreaterThan(0);
      expect(data.warnings[0]).toContain('rafters add');
    });

    it('should respect tier parameter', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: ['button'],
        tier: 'focused',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.budget.tier).toBe('focused');
      expect(data.budget.budget).toBe(15);
    });

    it('should return error for empty components', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: [],
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('No components');
    });

    it('should return error when all components are unknown', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: ['completely-unknown-widget'],
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('No recognized components');
      expect(data.suggestion).toContain('rafters_vocabulary');
    });

    it('should handle mix of known and unknown components', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: ['button', 'unknown-widget'],
      });

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      // Only button is scored
      expect(data.budget.total).toBe(3);
      expect(data.attention.notes.some((n: string) => n.includes('Unknown'))).toBe(true);
    });
  });

  describe('error paths', () => {
    it('should return vocabulary even when token directory is missing', async () => {
      // Remove the tokens directory to simulate a fresh project
      await rm(join(testDir, '.rafters', 'tokens'), { recursive: true, force: true });

      const result = await handler.handleToolCall('rafters_vocabulary', {});

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      // Static fallbacks still present
      expect(data.colors.semantic).toContain('primary');
      expect(Object.keys(data.spacing.scale).length).toBeGreaterThan(0);
      expect(data.typography.weights.length).toBeGreaterThan(0);
    });

    it('should return component not-found with suggestion for unknown component', async () => {
      const result = await handler.handleToolCall('rafters_component', {
        name: 'nonexistent-widget',
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.suggestion).toContain('rafters_vocabulary');
    });

    it('should return similar component names when partial match exists', async () => {
      const componentsDir = join(testDir, 'packages/ui/src/components/ui');
      await mkdir(componentsDir, { recursive: true });
      await writeFile(
        join(componentsDir, 'button.tsx'),
        `/** @cognitive-load 2/10 */
export function Button() { return null; }`,
      );

      // Use a substring that triggers the includes() filter
      const result = await handler.handleToolCall('rafters_component', {
        name: 'button-large',
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.similar).toBeDefined();
      expect(data.similar).toContain('button');
    });

    it('should return token not-found when all namespaces are empty', async () => {
      const result = await handler.handleToolCall('rafters_token', {
        name: 'nonexistent-token',
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
      expect(data.suggestion).toContain('rafters_vocabulary');
      // No similar tokens since no namespaces have data
      expect(data.similar).toBeUndefined();
    });

    it('should return error for invalid cognitive budget tier', async () => {
      const result = await handler.handleToolCall('rafters_cognitive_budget', {
        components: ['button'],
        tier: 'invalid-tier',
      });

      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('Invalid tier');
      expect(data.available).toBeDefined();
      expect(data.available).toContain('focused');
      expect(data.available).toContain('page');
      expect(data.available).toContain('app');
    });

    it('should handle corrupt token file gracefully', async () => {
      await writeFile(
        join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
        'not valid json at all',
      );

      // Vocabulary should still work with static fallbacks
      const result = await handler.handleToolCall('rafters_vocabulary', {});
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.colors.semantic).toContain('primary');
    });

    it('should handle corrupt token file in token lookup gracefully', async () => {
      await writeFile(join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'), '{corrupt');

      const result = await handler.handleToolCall('rafters_token', {
        name: 'spacing-1',
      });

      // Should return not-found rather than crash
      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('not found');
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const result = await handler.handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);

      const data = result.content[0].text as string;
      expect(data).toContain('Unknown tool');
    });
  });
});
