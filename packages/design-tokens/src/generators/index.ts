/**
 * Design Token Generators
 *
 * Orchestrates all token generators to produce a complete base design system.
 * Each generator produces tokens for a specific namespace, which are then
 * combined and can be serialized to namespace-based JSON files.
 *
 * Generators are pure functions - they receive configuration and default data
 * as parameters, making them easy to customize and test.
 *
 * The generators use:
 * - @rafters/math-utils for mathematical progressions (minor-third 1.2 ratio)
 * - OKLCH color space for perceptually uniform colors
 * - Full Token schema with intelligence metadata for MCP access
 */

import type { Token } from '@rafters/shared';
import { type ToDTCGOptions, toDTCG } from '../exporters/dtcg.js';
import { registryToTailwind, type TailwindExportOptions } from '../exporters/tailwind.js';
import { registryToTypeScript, type TypeScriptExportOptions } from '../exporters/typescript.js';
import { TokenRegistry } from '../registry.js';
import { generateBreakpointTokens } from './breakpoint.js';
// Import all generators
import { buildColorScaleFromBase, generateColorTokens } from './color.js';
// Import defaults
import {
  type ColorPaletteBase,
  type ColorScaleInput,
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLOR_SCALES,
  DEFAULT_CONTAINER_BREAKPOINTS,
  DEFAULT_DELAY_DEFINITIONS,
  DEFAULT_DEPTH_DEFINITIONS,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_ELEVATION_DEFINITIONS,
  DEFAULT_FILL_DEFINITIONS,
  DEFAULT_FOCUS_CONFIGS,
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_RADIUS_DEFINITIONS,
  DEFAULT_SEMANTIC_COLOR_BASES,
  DEFAULT_SHADOW_DEFINITIONS,
  DEFAULT_SPACING_MULTIPLIERS,
  DEFAULT_TYPOGRAPHY_SCALE,
} from './defaults.js';
import { generateDepthTokens } from './depth.js';
import { generateElevationTokens } from './elevation.js';
import { generateFillTokens } from './fill.js';
import { generateFocusTokens } from './focus.js';
import { generateMotionTokens } from './motion.js';
import { generateRadiusTokens } from './radius.js';
import { generateSemanticTokens } from './semantic.js';
import { generateShadowTokens } from './shadow.js';
import { generateSpacingTokens } from './spacing.js';
import type { BaseSystemConfig, ResolvedSystemConfig } from './types.js';
import { DEFAULT_SYSTEM_CONFIG, resolveConfig } from './types.js';
import { generateTypographyTokens } from './typography.js';
import { generateTypographyCompositeTokens } from './typography-composite.js';

export { generateBreakpointTokens } from './breakpoint.js';
// Export all generators individually
export { buildColorScaleFromBase, generateColorTokens } from './color.js';
// Export defaults for customization
export * from './defaults.js';
export { generateDepthTokens } from './depth.js';
export { generateElevationTokens } from './elevation.js';
export { generateFillTokens } from './fill.js';
export { generateFocusTokens } from './focus.js';
export { generateMotionTokens } from './motion.js';
export { generateRadiusTokens } from './radius.js';
export { generateSemanticTokens } from './semantic.js';
export { generateShadowTokens } from './shadow.js';
export { generateSpacingTokens } from './spacing.js';
// Export types
export * from './types.js';
export { generateTypographyTokens } from './typography.js';
export { generateTypographyCompositeTokens } from './typography-composite.js';

/**
 * Generator configuration - defines name and how to call each generator
 * Generators are called in dependency order
 */
interface GeneratorDef {
  name: string;
  generate: (config: ResolvedSystemConfig) => { namespace: string; tokens: Token[] };
}

/**
 * Create generator definitions that bind defaults to pure generator functions
 */
/**
 * Build the complete color scales array from:
 * 1. Pre-defined color scales (neutral)
 * 2. Semantic color bases (computed via math) - custom or default
 */
function buildAllColorScales(customBases?: Record<string, ColorPaletteBase>): ColorScaleInput[] {
  const bases = customBases ?? DEFAULT_SEMANTIC_COLOR_BASES;
  const semanticScales = Object.entries(bases).map(([name, base]) =>
    buildColorScaleFromBase(name, base),
  );

  return [...DEFAULT_COLOR_SCALES, ...semanticScales];
}

function createGeneratorDefs(colorPaletteBases?: Record<string, ColorPaletteBase>): GeneratorDef[] {
  return [
    // Foundation tokens (no dependencies)
    {
      name: 'color',
      generate: (config) => generateColorTokens(config, buildAllColorScales(colorPaletteBases)),
    },
    {
      name: 'spacing',
      generate: (config) => generateSpacingTokens(config, DEFAULT_SPACING_MULTIPLIERS),
    },
    {
      name: 'typography',
      generate: (config) =>
        generateTypographyTokens(config, DEFAULT_TYPOGRAPHY_SCALE, DEFAULT_FONT_WEIGHTS),
    },
    {
      name: 'breakpoint',
      generate: (config) =>
        generateBreakpointTokens(config, DEFAULT_BREAKPOINTS, DEFAULT_CONTAINER_BREAKPOINTS),
    },

    // Semantic tokens (depend on color)
    { name: 'semantic', generate: (config) => generateSemanticTokens(config) },

    // Typography composites (depend on typography)
    {
      name: 'typography-composite',
      generate: (config) => generateTypographyCompositeTokens(config),
    },

    // Derived tokens (depend on spacing/foundation)
    {
      name: 'radius',
      generate: (config) => generateRadiusTokens(config, DEFAULT_RADIUS_DEFINITIONS),
    },
    {
      name: 'shadow',
      generate: (config) => generateShadowTokens(config, DEFAULT_SHADOW_DEFINITIONS),
    },
    {
      name: 'depth',
      generate: (config) => generateDepthTokens(config, DEFAULT_DEPTH_DEFINITIONS),
    },
    {
      name: 'motion',
      generate: (config) =>
        generateMotionTokens(
          config,
          DEFAULT_DURATION_DEFINITIONS,
          DEFAULT_EASING_DEFINITIONS,
          DEFAULT_DELAY_DEFINITIONS,
        ),
    },

    // Fill tokens (depend on color/semantic)
    {
      name: 'fill',
      generate: (_config) => generateFillTokens(_config, DEFAULT_FILL_DEFINITIONS),
    },

    // Composite tokens (depend on multiple)
    {
      name: 'elevation',
      generate: (config) => generateElevationTokens(config, DEFAULT_ELEVATION_DEFINITIONS),
    },
    {
      name: 'focus',
      generate: (config) => generateFocusTokens(config, DEFAULT_FOCUS_CONFIGS),
    },
  ];
}

/**
 * Result of running all generators
 */
export interface GenerateAllResult {
  /** All tokens by namespace */
  byNamespace: Map<string, Token[]>;

  /** Flat array of all tokens */
  allTokens: Token[];

  /** Generation metadata */
  metadata: {
    generatedAt: string;
    config: ResolvedSystemConfig;
    tokenCount: number;
    namespaces: string[];
  };
}

/**
 * Generate the complete base design system
 *
 * @param config - Optional configuration overrides
 * @returns All tokens organized by namespace
 *
 * @example
 * ```typescript
 * // Generate with defaults (baseSpacingUnit=4, minor-third progression)
 * const result = generateBaseSystem();
 *
 * // Generate with different progression (all values recalculated)
 * const result = generateBaseSystem({
 *   progressionRatio: 'perfect-fourth', // 1.333 ratio - whole system regenerates
 * });
 *
 * // Override specific derived values while keeping the system
 * const result = generateBaseSystem({
 *   baseFontSizeOverride: 18, // Override computed font size
 * });
 *
 * // Access tokens by namespace
 * const spacingTokens = result.byNamespace.get('spacing');
 *
 * // Serialize to JSON files
 * for (const [namespace, tokens] of result.byNamespace) {
 *   fs.writeFileSync(
 *     `.rafters/tokens/${namespace}.json`,
 *     JSON.stringify(tokens, null, 2)
 *   );
 * }
 * ```
 */
export function generateBaseSystem(config: Partial<BaseSystemConfig> = {}): GenerateAllResult {
  const mergedConfig: BaseSystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...config,
  };

  // Resolve derived values from baseSpacingUnit
  const resolvedConfig = resolveConfig(mergedConfig);

  const byNamespace = new Map<string, Token[]>();
  const allTokens: Token[] = [];

  const generators = createGeneratorDefs(mergedConfig.colorPaletteBases);
  for (const { generate } of generators) {
    const result = generate(resolvedConfig);
    byNamespace.set(result.namespace, result.tokens);
    allTokens.push(...result.tokens);
  }

  return {
    byNamespace,
    allTokens,
    metadata: {
      generatedAt: new Date().toISOString(),
      config: resolvedConfig,
      tokenCount: allTokens.length,
      namespaces: Array.from(byNamespace.keys()),
    },
  };
}

/**
 * Generate tokens for specific namespaces only
 *
 * @param namespaces - Array of namespace names to generate
 * @param config - Optional configuration overrides
 * @returns Tokens for requested namespaces only
 *
 * @example
 * ```typescript
 * // Generate only color and semantic tokens
 * const result = generateNamespaces(['color', 'semantic']);
 * ```
 */
export function generateNamespaces(
  namespaces: string[],
  config: Partial<BaseSystemConfig> = {},
): GenerateAllResult {
  const mergedConfig: BaseSystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...config,
  };

  // Resolve derived values from baseSpacingUnit
  const resolvedConfig = resolveConfig(mergedConfig);

  const byNamespace = new Map<string, Token[]>();
  const allTokens: Token[] = [];

  const generators = createGeneratorDefs(mergedConfig.colorPaletteBases);
  const requestedGenerators = generators.filter((g) => namespaces.includes(g.name));

  for (const { generate } of requestedGenerators) {
    const result = generate(resolvedConfig);
    byNamespace.set(result.namespace, result.tokens);
    allTokens.push(...result.tokens);
  }

  return {
    byNamespace,
    allTokens,
    metadata: {
      generatedAt: new Date().toISOString(),
      config: resolvedConfig,
      tokenCount: allTokens.length,
      namespaces: Array.from(byNamespace.keys()),
    },
  };
}

/**
 * Convert tokens to namespace-based JSON structure
 * Ready for writing to .rafters/tokens/ directory
 *
 * @param result - Result from generateBaseSystem or generateNamespaces
 * @returns Object with namespace keys and token arrays as values
 *
 * @example
 * ```typescript
 * const result = generateBaseSystem();
 * const jsonFiles = toNamespaceJSON(result);
 *
 * // jsonFiles = {
 * //   color: [...tokens],
 * //   spacing: [...tokens],
 * //   ...
 * // }
 * ```
 */
export function toNamespaceJSON(result: GenerateAllResult): Record<string, Token[]> {
  const output: Record<string, Token[]> = {};

  for (const [namespace, tokens] of result.byNamespace) {
    output[namespace] = tokens;
  }

  return output;
}

/**
 * Get a flat map of token name to token for quick lookups
 *
 * @param result - Result from generateBaseSystem or generateNamespaces
 * @returns Map of token names to Token objects
 */
export function toTokenMap(result: GenerateAllResult): Map<string, Token> {
  const map = new Map<string, Token>();

  for (const token of result.allTokens) {
    map.set(token.name, token);
  }

  return map;
}

/**
 * Get list of all available namespaces
 */
export function getAvailableNamespaces(): string[] {
  return createGeneratorDefs().map((g) => g.name);
}

/**
 * Get generator metadata
 */
export function getGeneratorInfo(): Array<{ name: string; description: string }> {
  return [
    {
      name: 'color',
      description: 'Neutral and semantic color families with 11-position OKLCH scale',
    },
    { name: 'spacing', description: 'Spacing scale using minor-third (1.2) progression' },
    { name: 'typography', description: 'Typography scale with font sizes, weights, line heights' },
    { name: 'breakpoint', description: 'Viewport and container query breakpoints' },
    {
      name: 'semantic',
      description: 'Semantic color tokens (primary, destructive, success, etc.)',
    },
    { name: 'radius', description: 'Border radius scale using minor-third progression' },
    { name: 'shadow', description: 'Shadow scale derived from spacing progression' },
    { name: 'depth', description: 'Z-index scale for stacking context management' },
    { name: 'motion', description: 'Duration, easing, and delay tokens for animations' },
    {
      name: 'fill',
      description:
        'Composite fill tokens (color + opacity + blur + gradients) with dual-context resolution',
    },
    { name: 'elevation', description: 'Elevation levels pairing depth with shadows' },
    { name: 'focus', description: 'Focus ring tokens for WCAG 2.2 compliance' },
    {
      name: 'typography-composite',
      description: 'Composite typography roles mapping semantic roles to font properties',
    },
  ];
}

// =============================================================================
// BUILD DEFAULTS
// =============================================================================

/**
 * Options for building and exporting the token system
 */
export interface BuildColorSystemOptions {
  /** Configuration overrides for the base system (including colorPaletteBases) */
  config?: Partial<BaseSystemConfig>;

  /** Export format options */
  exports?: {
    /** DTCG format options */
    dtcg?: ToDTCGOptions | boolean;
    /** Tailwind v4 CSS options */
    tailwind?: TailwindExportOptions | boolean;
    /** TypeScript options */
    typescript?: TypeScriptExportOptions | boolean;
  };
}

/** @deprecated Use BuildColorSystemOptions instead */
export type BuildDefaultsOptions = BuildColorSystemOptions;

/**
 * Result of building the token system
 */
export interface BuildColorSystemResult {
  /** The generated token system */
  system: GenerateAllResult;

  /** TokenRegistry populated with all tokens */
  registry: TokenRegistry;

  /** Exported formats (if requested) */
  exports: {
    dtcg?: ReturnType<typeof toDTCG>;
    tailwind?: string;
    typescript?: string;
  };
}

/** @deprecated Use BuildColorSystemResult instead */
export type BuildDefaultsResult = BuildColorSystemResult;

/**
 * Build a complete Rafters token system with exports.
 *
 * This is the primary entry point for generating a complete design token system.
 * Pass custom colorPaletteBases to generate a system with different colors.
 *
 * @param options - Configuration and export options
 * @returns Generated system, registry, and exports
 *
 * @example
 * ```typescript
 * // Generate with defaults (CLI init)
 * const result = buildColorSystem();
 *
 * // Generate with custom colors (Studio color picker)
 * import { generateHarmony } from '@rafters/color-utils';
 * const harmony = generateHarmony(userPickedColor);
 * // Map harmony arrays to color palette bases as needed
 * const result = buildColorSystem({ config: { colorPaletteBases } });
 *
 * // Generate with exports
 * const result = buildColorSystem({
 *   exports: {
 *     dtcg: true,
 *     tailwind: { includeComments: true },
 *     typescript: { format: 'const' },
 *   },
 * });
 * ```
 */
export function buildColorSystem(options: BuildColorSystemOptions = {}): BuildColorSystemResult {
  // Generate the base system
  const system = generateBaseSystem(options.config);

  // Create registry with all tokens
  const registry = new TokenRegistry(system.allTokens);

  // Build exports
  const exports: BuildColorSystemResult['exports'] = {};

  if (options.exports?.dtcg) {
    const dtcgOptions = typeof options.exports.dtcg === 'object' ? options.exports.dtcg : {};
    exports.dtcg = toDTCG(system.allTokens, dtcgOptions);
  }

  if (options.exports?.tailwind) {
    const tailwindOptions =
      typeof options.exports.tailwind === 'object' ? options.exports.tailwind : {};
    exports.tailwind = registryToTailwind(registry, tailwindOptions);
  }

  if (options.exports?.typescript) {
    const tsOptions =
      typeof options.exports.typescript === 'object' ? options.exports.typescript : {};
    exports.typescript = registryToTypeScript(registry, tsOptions);
  }

  return {
    system,
    registry,
    exports,
  };
}

/** @deprecated Use buildColorSystem instead */
export const buildDefaults = buildColorSystem;
