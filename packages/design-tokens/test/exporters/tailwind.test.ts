/**
 * Tests for Tailwind v4 CSS Exporter
 */

import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { registryToTailwind, tokensToTailwind } from '../../src/exporters/tailwind.js';
import { TokenRegistry } from '../../src/registry.js';

describe('tokensToTailwind', () => {
  it('should export color scales with --color- prefix in @theme block', () => {
    const tokens: Token[] = [
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('@theme {');
    expect(css).toContain('--color-neutral-500: oklch(0.55 0 0);');
  });

  it('should generate :root block with --rafters-* namespace', () => {
    const tokens: Token[] = [
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain(':root {');
    expect(css).toContain('--rafters-background: var(--color-neutral-50);');
    expect(css).toContain('--rafters-dark-background: var(--color-neutral-950);');
    expect(css).toContain('--background: var(--rafters-background);');
  });

  it('should include dark mode via @media prefers-color-scheme', () => {
    const tokens: Token[] = [
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('@media (prefers-color-scheme: dark) {');
    expect(css).toContain('--background: var(--rafters-dark-background);');
  });

  it('should export spacing tokens with --spacing- prefix', () => {
    const tokens: Token[] = [
      { name: 'spacing-4', value: '1rem', category: 'spacing', namespace: 'spacing' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--spacing-spacing-4: 1rem;');
  });

  it('should export typography tokens with line-height companions', () => {
    const tokens: Token[] = [
      {
        name: 'text-base',
        value: '1rem',
        category: 'typography',
        namespace: 'typography',
        lineHeight: '1.5',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--text-base: 1rem;');
    expect(css).toContain('--text-base--line-height: 1.5;');
  });

  it('should throw if registry is empty', () => {
    expect(() => tokensToTailwind([])).toThrow('Registry is empty');
  });

  it('should include @import tailwindcss by default', () => {
    const tokens: Token[] = [
      { name: 'test', value: 'value', category: 'test', namespace: 'other' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('@import "tailwindcss";');
  });

  it('should omit @import when includeImport=false', () => {
    const tokens: Token[] = [
      { name: 'test', value: 'value', category: 'test', namespace: 'other' },
    ];

    const css = tokensToTailwind(tokens, { includeImport: false });

    expect(css).not.toContain('@import "tailwindcss";');
  });

  it('should export radius tokens with --radius- prefix', () => {
    const tokens: Token[] = [
      { name: 'radius-sm', value: '0.25rem', category: 'radius', namespace: 'radius' },
      { name: 'radius-md', value: '0.375rem', category: 'radius', namespace: 'radius' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--radius-radius-sm: 0.25rem;');
    expect(css).toContain('--radius-radius-md: 0.375rem;');
  });

  it('should export shadow tokens with --shadow- prefix', () => {
    const tokens: Token[] = [
      {
        name: 'shadow-sm',
        value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        category: 'shadow',
        namespace: 'shadow',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--shadow-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);');
  });

  it('should export depth tokens', () => {
    const tokens: Token[] = [
      { name: 'depth-dropdown', value: '10', category: 'depth', namespace: 'depth' },
      { name: 'depth-modal', value: '50', category: 'depth', namespace: 'depth' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--depth-dropdown: 10;');
    expect(css).toContain('--depth-modal: 50;');
  });

  it('should export motion tokens', () => {
    const tokens: Token[] = [
      { name: 'duration-fast', value: '150ms', category: 'motion', namespace: 'motion' },
      {
        name: 'easing-ease-out',
        value: 'cubic-bezier(0, 0, 0.2, 1)',
        category: 'motion',
        namespace: 'motion',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--duration-fast: 150ms;');
    expect(css).toContain('--easing-ease-out: cubic-bezier(0, 0, 0.2, 1);');
  });

  it('should export breakpoint tokens including container queries', () => {
    const tokens: Token[] = [
      { name: 'container-sm', value: '24rem', category: 'breakpoint', namespace: 'breakpoint' },
      { name: 'container-md', value: '28rem', category: 'breakpoint', namespace: 'breakpoint' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--container-sm: 24rem;');
    expect(css).toContain('--container-md: 28rem;');
  });

  it('should bridge semantic colors with --color- prefix in @theme', () => {
    const tokens: Token[] = [
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ];

    const css = tokensToTailwind(tokens);

    // Should create bridge references
    expect(css).toContain('--color-background: var(--background);');
    expect(css).toContain('--color-primary: var(--primary);');
  });

  it('should include .dark class for manual toggle support', () => {
    const tokens: Token[] = [
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('.dark {');
    expect(css).toMatch(/\.dark \{[^}]*--background: var\(--rafters-dark-background\);/);
  });

  it('should generate @keyframes from motion-keyframe-* tokens', () => {
    const tokens: Token[] = [
      {
        name: 'motion-keyframe-fade-in',
        value: 'from { opacity: 0; } to { opacity: 1; }',
        category: 'motion',
        namespace: 'motion',
        keyframeName: 'fade-in',
      },
      {
        name: 'motion-keyframe-slide-up',
        value:
          'from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; }',
        category: 'motion',
        namespace: 'motion',
        keyframeName: 'slide-up',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('@keyframes fade-in {');
    expect(css).toContain('from { opacity: 0; } to { opacity: 1; }');
    expect(css).toContain('@keyframes slide-up {');
  });

  it('should generate --animate-* tokens from motion-animation-* tokens', () => {
    const tokens: Token[] = [
      {
        name: 'motion-animation-fade-in',
        value: 'fade-in var(--motion-duration-normal) var(--motion-easing-ease-out)',
        category: 'motion',
        namespace: 'motion',
        animationName: 'fade-in',
      },
      {
        name: 'motion-animation-spin',
        value: 'spin var(--motion-duration-slow) var(--motion-easing-linear) infinite',
        category: 'motion',
        namespace: 'motion',
        animationName: 'spin',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain(
      '--animate-fade-in: fade-in var(--motion-duration-normal) var(--motion-easing-ease-out);',
    );
    expect(css).toContain(
      '--animate-spin: spin var(--motion-duration-slow) var(--motion-easing-linear) infinite;',
    );
  });

  it('should place --animate-* tokens inside @theme block', () => {
    const tokens: Token[] = [
      {
        name: 'motion-animation-fade-in',
        value: 'fade-in var(--motion-duration-normal) var(--motion-easing-ease-out)',
        category: 'motion',
        namespace: 'motion',
        animationName: 'fade-in',
      },
    ];

    const css = tokensToTailwind(tokens);

    // --animate-* should be inside @theme block
    const themeMatch = css.match(/@theme \{([\s\S]*?)\}/);
    expect(themeMatch).not.toBeNull();
    expect(themeMatch?.[1]).toContain('--animate-fade-in:');
  });

  it('should exclude tokens with JSON object string values from CSS output', () => {
    const tokens: Token[] = [
      { name: 'normal-token', value: '16px', category: 'spacing', namespace: 'spacing' },
      {
        name: 'json-object-token',
        value: '{"key": "value", "nested": {"a": 1}}',
        category: 'other',
        namespace: 'other',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--spacing-normal-token: 16px;');
    expect(css).not.toContain('json-object-token');
    expect(css).not.toContain('"key"');
  });

  it('should exclude tokens with JSON array string values from CSS output', () => {
    const tokens: Token[] = [
      { name: 'normal-token', value: '1rem', category: 'spacing', namespace: 'spacing' },
      {
        name: 'json-array-token',
        value: '[{"l": 0.5, "c": 0.1, "h": 240}]',
        category: 'other',
        namespace: 'other',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--spacing-normal-token: 1rem;');
    expect(css).not.toContain('json-array-token');
  });

  it('should still include normal string tokens in CSS output', () => {
    const tokens: Token[] = [
      { name: 'size-base', value: '16px', category: 'typography', namespace: 'typography' },
      {
        name: 'shadow-sm',
        value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        category: 'shadow',
        namespace: 'shadow',
      },
    ];

    const css = tokensToTailwind(tokens);

    expect(css).toContain('--size-base: 16px;');
    expect(css).toContain('--shadow-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);');
  });

  it('should place @keyframes outside @theme block', () => {
    const tokens: Token[] = [
      {
        name: 'motion-keyframe-fade-in',
        value: 'from { opacity: 0; } to { opacity: 1; }',
        category: 'motion',
        namespace: 'motion',
        keyframeName: 'fade-in',
      },
    ];

    const css = tokensToTailwind(tokens);

    // @keyframes should appear after @theme block ends
    const themeEnd = css.indexOf('}', css.indexOf('@theme {'));
    const keyframesStart = css.indexOf('@keyframes fade-in');
    expect(keyframesStart).toBeGreaterThan(themeEnd);
  });
});

describe('registryToTailwind', () => {
  it('should convert registry to Tailwind CSS', () => {
    const registry = new TokenRegistry([
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ]);

    const css = registryToTailwind(registry);

    expect(css).toContain('@theme {');
    expect(css).toContain(':root {');
    expect(css).toContain('--color-neutral-500: oklch(0.55 0 0);');
  });
});

describe('registryToCompiled', () => {
  it('should compile registry to standalone CSS via Tailwind CLI', async () => {
    const { registryToCompiled } = await import('../../src/exporters/tailwind.js');

    const registry = new TokenRegistry([
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
      { name: 'spacing-4', value: '1rem', category: 'spacing', namespace: 'spacing' },
    ]);

    const css = await registryToCompiled(registry);

    // Compiled output should NOT have @import or @theme (those are source directives)
    expect(css).not.toContain('@import "tailwindcss"');
    expect(css).not.toContain('@theme {');

    // Should have the actual CSS custom properties in :root
    expect(css).toContain(':root');
    expect(css).toContain('--color-neutral-500');
    expect(css).toContain('--spacing-spacing-4');
  });

  it('should minify output by default', async () => {
    const { registryToCompiled } = await import('../../src/exporters/tailwind.js');

    const registry = new TokenRegistry([
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ]);

    const css = await registryToCompiled(registry);

    // Minified CSS has minimal whitespace
    expect(css).not.toMatch(/\n\s+\n/); // No empty lines
  });

  it('should not minify when minify=false', async () => {
    const { registryToCompiled } = await import('../../src/exporters/tailwind.js');

    const registry = new TokenRegistry([
      { name: 'neutral-500', value: 'oklch(0.55 0 0)', category: 'color', namespace: 'color' },
    ]);

    const css = await registryToCompiled(registry, { minify: false });

    // Non-minified CSS has readable formatting
    expect(css).toContain('\n');
  });

  it('should throw on empty registry', async () => {
    const { registryToCompiled } = await import('../../src/exporters/tailwind.js');

    const registry = new TokenRegistry([]);

    await expect(registryToCompiled(registry)).rejects.toThrow('Registry is empty');
  });

  it('should include semantic color mappings with dark mode', async () => {
    const { registryToCompiled } = await import('../../src/exporters/tailwind.js');

    const registry = new TokenRegistry([
      { name: 'neutral-50', value: 'oklch(0.98 0 0)', category: 'color', namespace: 'color' },
      { name: 'neutral-950', value: 'oklch(0.1 0 0)', category: 'color', namespace: 'color' },
    ]);

    const css = await registryToCompiled(registry);

    // Should have semantic variables
    expect(css).toContain('--background');
    expect(css).toContain('--rafters-background');
    expect(css).toContain('--rafters-dark-background');
  });
});
