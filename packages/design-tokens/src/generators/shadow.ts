/**
 * Shadow Generator
 *
 * Generates shadow tokens derived from the spacing progression.
 * Uses minor-third (1.2) ratio for harmonious shadow scale.
 *
 * This generator is a pure function - it receives shadow definitions as input.
 * Default shadow values are provided by the orchestrator from defaults.ts.
 */

import { getRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { ShadowDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { SHADOW_SCALE } from './types.js';

/**
 * Convert px value to rem string
 */
function pxToRem(px: number): string {
  const rem = Math.round((px / 16) * 1000) / 1000;
  return `${rem}rem`;
}

const SHADOW_PARTS = ['offset-x', 'offset-y', 'blur', 'spread', 'color'] as const;

/** Scale a multiplier by base spacing, rounded to 2 decimal places */
function scalePx(multiplier: number, baseSpacing: number): number {
  return Math.round(multiplier * baseSpacing * 100) / 100;
}

/**
 * Compute resolved shadow part values from a definition.
 * Returns the raw CSS values for each decomposed property.
 */
function resolveShadowParts(
  def: ShadowDef,
  baseSpacing: number,
): Record<(typeof SHADOW_PARTS)[number], string> {
  return {
    // Shadows are vertical-only by design (material elevation model)
    'offset-x': '0rem',
    'offset-y': pxToRem(scalePx(def.yOffset, baseSpacing)),
    blur: pxToRem(scalePx(def.blur, baseSpacing)),
    spread: pxToRem(scalePx(def.spread, baseSpacing)),
    color: `rgb(0 0 0 / ${def.opacity})`,
  };
}

/**
 * Generate inner shadow CSS string (not decomposed -- edge case, low override demand)
 */
function generateInnerShadowValue(
  inner: NonNullable<ShadowDef['innerShadow']>,
  baseSpacing: number,
): string {
  const y = pxToRem(scalePx(inner.yOffset, baseSpacing));
  const blur = pxToRem(scalePx(inner.blur, baseSpacing));
  const spread = pxToRem(scalePx(inner.spread, baseSpacing));
  return `0 ${y} ${blur} ${spread} rgb(0 0 0 / ${inner.opacity})`;
}

/**
 * Build composite shadow value from var() references to decomposed tokens,
 * plus an optional baked inner shadow layer.
 */
function buildCompositeFromVars(prefix: string, innerValue: string | null): string {
  const primary = SHADOW_PARTS.map((part) => `var(--rafters-${prefix}-${part})`).join(' ');
  return innerValue ? `${primary}, ${innerValue}` : primary;
}

/**
 * Generate shadow tokens from provided definitions
 */
export function generateShadowTokens(
  config: ResolvedSystemConfig,
  shadowDefs: Record<string, ShadowDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseSpacingUnit, progressionRatio } = config;
  const ratioValue = getRatio(progressionRatio);

  // Shadow reference token - use rem
  const baseSpacingRem = baseSpacingUnit / 16;

  tokens.push({
    name: 'shadow-base-unit',
    value: `${baseSpacingRem}rem`,
    category: 'shadow',
    namespace: 'shadow',
    semanticMeaning: 'Base unit for shadow calculations - tied to spacing for consistency',
    usageContext: ['calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    dependsOn: ['spacing-base'],
    description: `Shadows derive from spacing base (${baseSpacingRem}rem) for visual consistency.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  // Generate tokens for each shadow level
  for (const scale of SHADOW_SCALE) {
    const def = shadowDefs[scale];
    if (!def) continue;
    const scaleIndex = SHADOW_SCALE.indexOf(scale);
    const scaleName = scale === 'DEFAULT' ? 'shadow' : `shadow-${scale}`;

    // "none" has no decomposed parts
    if (def.opacity === 0) {
      tokens.push({
        name: scaleName,
        value: 'none',
        category: 'shadow',
        namespace: 'shadow',
        semanticMeaning: def.meaning,
        usageContext: def.contexts,
        scalePosition: scaleIndex,
        progressionSystem: progressionRatio as 'minor-third',
        dependsOn: [],
        description: `Shadow ${scale}: ${def.meaning}`,
        generatedAt: timestamp,
        containerQueryAware: false,
        userOverride: null,
        usagePatterns: {
          do: ['Use for flat elements', 'Use for disabled states'],
          never: ['Use on interactive elements that need depth feedback'],
        },
      });
      continue;
    }

    // Decomposed tokens for this scale
    const parts = resolveShadowParts(def, baseSpacingUnit);
    const partDeps: string[] = [];

    for (const part of SHADOW_PARTS) {
      const partName = `${scaleName}-${part}`;
      partDeps.push(partName);

      tokens.push({
        name: partName,
        value: parts[part],
        category: 'shadow',
        namespace: 'shadow',
        semanticMeaning: `${part} component of ${scale} shadow`,
        usageContext: ['designer-override'],
        scalePosition: scaleIndex,
        dependsOn: ['shadow-base-unit'],
        description: `Shadow ${scale} ${part}: ${parts[part]}. Override to customize this shadow layer.`,
        generatedAt: timestamp,
        containerQueryAware: false,
        userOverride: null,
      });
    }

    // Composite token referencing decomposed parts via var()
    const innerValue =
      def.innerShadow && def.innerShadow.opacity > 0
        ? generateInnerShadowValue(def.innerShadow, baseSpacingUnit)
        : null;
    const compositeValue = buildCompositeFromVars(scaleName, innerValue);

    tokens.push({
      name: scaleName,
      value: compositeValue,
      category: 'shadow',
      namespace: 'shadow',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      progressionSystem: progressionRatio as 'minor-third',
      dependsOn: partDeps,
      description: `Shadow ${scale}: ${def.meaning}. Composed from var() refs to ${scaleName}-* tokens.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
      usagePatterns: {
        do:
          scaleIndex <= 2
            ? ['Use for subtle depth', 'Use for cards at rest']
            : scaleIndex <= 4
              ? ['Use for hovering elements', 'Use for focus states']
              : ['Use for floating elements', 'Use for modals'],
        never: ["Use shadows that don't match element's semantic depth"],
      },
    });
  }

  // Colored shadow variants -- reuse decomposed geometry from DEFAULT, swap color
  const baseDef = shadowDefs.DEFAULT;
  if (baseDef) {
    const coloredOpacity = baseDef.opacity * ratioValue;
    const coloredShadows = [
      {
        name: 'shadow-primary',
        desc: 'Primary colored shadow for emphasis',
        color: 'var(--primary)',
        colorToken: 'primary',
      },
      {
        name: 'shadow-destructive',
        desc: 'Destructive colored shadow for warnings',
        color: 'var(--destructive)',
        colorToken: 'destructive',
      },
    ];

    for (const { name, desc, color, colorToken } of coloredShadows) {
      const value = `var(--rafters-shadow-offset-x) var(--rafters-shadow-offset-y) var(--rafters-shadow-blur) var(--rafters-shadow-spread) color-mix(in oklch, ${color} ${coloredOpacity * 100}%, transparent)`;

      tokens.push({
        name,
        value,
        category: 'shadow',
        namespace: 'shadow',
        semanticMeaning: desc,
        usageContext: ['branded-elements', 'emphasis'],
        dependsOn: [
          'shadow-offset-x',
          'shadow-offset-y',
          'shadow-blur',
          'shadow-spread',
          colorToken,
        ],
        description: `${desc}. Reuses DEFAULT shadow geometry, swaps color via color-mix.`,
        generatedAt: timestamp,
        containerQueryAware: false,
        userOverride: null,
      });
    }
  }

  // Progression metadata
  tokens.push({
    name: 'shadow-progression',
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue,
      baseUnit: baseSpacingUnit,
      note: 'Shadow values derived from spacing progression for visual harmony',
    }),
    category: 'shadow',
    namespace: 'shadow',
    semanticMeaning: 'Metadata about the shadow progression system',
    description: `Shadows use ${progressionRatio} progression from spacing base.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'shadow',
    tokens,
  };
}
