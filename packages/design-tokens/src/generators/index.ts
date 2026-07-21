/**
 * Design Token Generators
 *
 * Per-namespace generators for the Rafters design system. Each generator is a
 * pure function that receives configuration and default data, and produces a
 * GeneratorResult containing tokens for one namespace.
 *
 * Orchestration that runs all generators is here. Anything that requires the
 * registry or exporters lives in the CLI's init flow, not here.
 */

import type { Token } from '@rafters/shared';
import { generateBreakpointTokens } from './breakpoint.js';
import { buildColorScaleFromBase, generateColorTokens } from './color.js';
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
  DEFAULT_FOCUS_CONFIGS,
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_RADIUS_DEFINITIONS,
  DEFAULT_SEMANTIC_COLOR_BASES,
  DEFAULT_SHADOW_DEFINITIONS,
  DEFAULT_SPACING_MULTIPLIERS,
  DEFAULT_TYPOGRAPHY_SCALE,
} from './defaults.js';
import { generateDepthTokens } from './depth.js';
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
export { buildColorScaleFromBase, generateColorTokens } from './color.js';
export * from './defaults.js';
export { generateDepthTokens } from './depth.js';
export { generateFocusTokens } from './focus.js';
export { generateMotionTokens } from './motion.js';
export {
  isLegalMotionComposition,
  MOTION_COMBINATION_CONSTRAINTS,
  MOTION_GOVERNING_RULE,
  type MotionAxis,
  type MotionComposition,
  type MotionConstraint,
  type MotionConstraintId,
  type MotionElementSize,
  type MotionGoverningRule,
  type MotionParameter,
  type MotionQuestion,
  type MotionViolation,
  validateMotionComposition,
} from './motion-constraints.js';
export { generateRadiusTokens } from './radius.js';
export { generateSemanticTokens } from './semantic.js';
export { generateShadowTokens } from './shadow.js';
export { generateSpacingTokens } from './spacing.js';
export * from './types.js';
export { generateTypographyTokens } from './typography.js';
export { generateTypographyCompositeTokens } from './typography-composite.js';

interface GeneratorDef {
  name: string;
  generate: (config: ResolvedSystemConfig) => { namespace: string; tokens: Token[] };
}

function buildAllColorScales(customBases?: Record<string, ColorPaletteBase>): ColorScaleInput[] {
  const bases = customBases ?? DEFAULT_SEMANTIC_COLOR_BASES;
  const semanticScales = Object.entries(bases).map(([name, base]) =>
    buildColorScaleFromBase(name, base),
  );

  return [...DEFAULT_COLOR_SCALES, ...semanticScales];
}

function createGeneratorDefs(colorPaletteBases?: Record<string, ColorPaletteBase>): GeneratorDef[] {
  return [
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
    { name: 'semantic', generate: (config) => generateSemanticTokens(config) },
    {
      name: 'typography-composite',
      generate: (config) => generateTypographyCompositeTokens(config),
    },
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
    {
      name: 'focus',
      generate: (config) => generateFocusTokens(config, DEFAULT_FOCUS_CONFIGS),
    },
  ];
}

export interface GenerateAllResult {
  byNamespace: Map<string, Token[]>;
  allTokens: Token[];
  metadata: {
    generatedAt: string;
    config: ResolvedSystemConfig;
    tokenCount: number;
    namespaces: string[];
  };
}

export function generateBaseSystem(config: Partial<BaseSystemConfig> = {}): GenerateAllResult {
  const mergedConfig: BaseSystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...config,
  };

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

export function generateNamespaces(
  namespaces: string[],
  config: Partial<BaseSystemConfig> = {},
): GenerateAllResult {
  const mergedConfig: BaseSystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG,
    ...config,
  };

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

export function toNamespaceJSON(result: GenerateAllResult): Record<string, Token[]> {
  const output: Record<string, Token[]> = {};

  for (const [namespace, tokens] of result.byNamespace) {
    output[namespace] = tokens;
  }

  return output;
}

export function toTokenMap(result: GenerateAllResult): Map<string, Token> {
  const map = new Map<string, Token>();

  for (const token of result.allTokens) {
    map.set(token.name, token);
  }

  return map;
}

export function getAvailableNamespaces(): string[] {
  return createGeneratorDefs().map((g) => g.name);
}
