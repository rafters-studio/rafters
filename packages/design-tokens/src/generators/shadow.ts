/**
 * Shadow Generator
 *
 * Shadow geometry lands on the shared progression. A definition states the
 * RELATIVE WEIGHT of an offset, blur or spread as a multiple of the base; the
 * generator resolves that weight onto the ratio-driven scale, so changing
 * `progressionRatio` moves shadow geometry the way it moves spacing, type and
 * radius.
 *
 * Before #2031 this file claimed exactly that in its header and did not do it:
 * every part was `multiplier * baseSpacing`, purely linear, while every emitted
 * token still stamped `progressionSystem`. The ratio reached one value in the
 * whole namespace -- a colored variant's alpha channel.
 *
 * SHADOW HAS ITS OWN FLOOR, at 1px. It is not spacing and does not start where
 * spacing starts: a blur thinner than a device pixel does not render, and a
 * 4px minimum blur would make `xs` heavier than `DEFAULT` is today. Same shape
 * as focus ring and hairline -- one shared ratio, a floor set by the medium.
 */

import { ratioValue, resolveRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import { nearestRung, progressionFrom } from './progression.js';
import type { ScaleBounds, ShadowDef } from './defaults.js';
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

/**
 * The progression shadow geometry sits on: whole pixels from a 1px floor,
 * counting up, colliding positions dropped -- the same construction spacing
 * uses, anchored lower because the medium allows a 1px shadow and does not
 * allow a 1px gap to mean anything.
 */
export function shadowScale(ratioVal: number, bounds: ScaleBounds): number[] {
  return progressionFrom(bounds.floor, ratioVal, bounds.ceiling);
}

/**
 * Resolve a definition's relative weight onto the progression.
 *
 * Zero stays zero -- `none` is the absence of a shadow, not the smallest one.
 */
function scalePx(multiplier: number, baseSpacing: number, scale: number[]): number {
  if (multiplier === 0) return 0;
  return nearestRung(multiplier * baseSpacing, scale);
}

/**
 * Compute resolved shadow part values from a definition.
 * Returns the raw CSS values for each decomposed property.
 */
function resolveShadowParts(
  def: ShadowDef,
  baseSpacing: number,
  scale: number[],
): Record<(typeof SHADOW_PARTS)[number], string> {
  return {
    // Shadows are vertical-only by design (material elevation model)
    'offset-x': '0rem',
    'offset-y': pxToRem(scalePx(def.yOffset, baseSpacing, scale)),
    blur: pxToRem(scalePx(def.blur, baseSpacing, scale)),
    spread: pxToRem(scalePx(def.spread, baseSpacing, scale)),
    color: `rgb(0 0 0 / ${def.opacity})`,
  };
}

/**
 * Generate inner shadow CSS string (not decomposed -- edge case, low override demand)
 */
function generateInnerShadowValue(
  inner: NonNullable<ShadowDef['innerShadow']>,
  baseSpacing: number,
  scale: number[],
): string {
  const y = pxToRem(scalePx(inner.yOffset, baseSpacing, scale));
  const blur = pxToRem(scalePx(inner.blur, baseSpacing, scale));
  const spread = pxToRem(scalePx(inner.spread, baseSpacing, scale));
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
  bounds: ScaleBounds,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseSpacingUnit, progressionRatio } = config;
  const ratioVal = ratioValue(resolveRatio(progressionRatio));
  const geometry = shadowScale(ratioVal, bounds);

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
    const parts = resolveShadowParts(def, baseSpacingUnit, geometry);
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
        ? generateInnerShadowValue(def.innerShadow, baseSpacingUnit, geometry)
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
    const coloredOpacity = baseDef.opacity * ratioVal;
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
      ratioValue: ratioVal,
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
