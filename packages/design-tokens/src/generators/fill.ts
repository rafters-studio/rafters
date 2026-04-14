/**
 * Fill Token Generator
 *
 * Generates fill tokens -- composite visual recipes that encode
 * color + opacity + optional backdrop-blur + gradients as designer-configurable tokens.
 *
 * Fills resolve differently based on context:
 * - Surface context (Container, Card): applies as background
 * - Text context (Typography color prop): applies as text color,
 *   with bg-clip-text for gradients
 *
 * This generator is a pure function -- it receives fill definitions as input.
 * Default fill values are provided by the orchestrator from defaults.ts.
 */

import type { Token } from '@rafters/shared';
import type { FillDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

/**
 * Validate a fill definition. Returns an error message or null if valid.
 */
function validateFillDef(name: string, def: FillDef): string | null {
  if (!def.color && !def.gradient) {
    return `Fill "${name}" must have either a color or gradient field`;
  }

  if (def.gradient) {
    if (!def.gradient.stops || def.gradient.stops.length < 2) {
      return `Fill "${name}" gradient must have at least 2 stops`;
    }
  }

  if (def.opacity !== undefined && (def.opacity < 0 || def.opacity > 1)) {
    return `Fill "${name}" opacity must be between 0 and 1`;
  }

  const validBlurSizes = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'];
  if (def.backdropBlur && !validBlurSizes.includes(def.backdropBlur)) {
    return `Fill "${name}" backdropBlur must be one of: ${validBlurSizes.join(', ')}`;
  }

  return null;
}

/**
 * Serialize fill metadata for token value storage.
 * The actual CSS resolution happens at consumption time via fill-resolver.
 */
function serializeFillValue(def: FillDef): string {
  const parts: Record<string, unknown> = {};

  if (def.color) parts.color = def.color;
  if (def.opacity !== undefined) parts.opacity = def.opacity;
  if (def.foreground) parts.foreground = def.foreground;
  if (def.backdropBlur) parts.backdropBlur = def.backdropBlur;
  if (def.gradient) parts.gradient = def.gradient;

  return JSON.stringify(parts);
}

/**
 * Generate fill tokens from provided definitions.
 *
 * Each fill definition produces a token with fill metadata stored as JSON
 * in the value field. The dual-context resolution (surface vs text) happens
 * at consumption time via the fill-resolver primitive.
 */
export function generateFillTokens(
  _config: ResolvedSystemConfig,
  fillDefinitions: Record<string, FillDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const fillNames = Object.keys(fillDefinitions);

  for (const [name, def] of Object.entries(fillDefinitions)) {
    const error = validateFillDef(name, def);
    if (error) {
      throw new Error(error);
    }

    const dependsOn: string[] = [];

    // Track color dependencies
    if (def.color) {
      dependsOn.push(def.color);
    }
    if (def.foreground) {
      dependsOn.push(def.foreground);
    }
    if (def.gradient) {
      for (const stop of def.gradient.stops) {
        dependsOn.push(stop.color);
      }
    }

    tokens.push({
      name: `fill-${name}`,
      value: serializeFillValue(def),
      category: 'fill',
      namespace: 'fill',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
      description: buildDescription(name, def),
      generatedAt: timestamp,
      containerQueryAware: true,
      scalePosition: fillNames.indexOf(name),
      userOverride: null,
      usagePatterns: {
        do: [
          `Use fill="${name}" on surface components (Container, Card) for ${def.meaning.toLowerCase()}`,
          ...(def.gradient ? [`Use color="${name}" on Typography for gradient text effect`] : []),
        ],
        never: [
          'Do not use raw bg-* classes when a fill token exists for the purpose',
          'Do not hardcode opacity values -- use the fill token instead',
        ],
      },
    });
  }

  return {
    namespace: 'fill',
    tokens,
  };
}

function buildDescription(name: string, def: FillDef): string {
  const parts: string[] = [`Fill token "${name}"`];

  if (def.color && def.opacity !== undefined && def.opacity < 1) {
    parts.push(`-- ${def.color} at ${Math.round(def.opacity * 100)}% opacity`);
  } else if (def.color) {
    parts.push(`-- solid ${def.color}`);
  }

  if (def.backdropBlur) {
    parts.push(`with backdrop-blur-${def.backdropBlur}`);
  }

  if (def.gradient) {
    const stops = def.gradient.stops.map((s) => s.color).join(' to ');
    parts.push(`-- gradient ${def.gradient.direction}: ${stops}`);
  }

  parts.push(`(${def.meaning})`);

  return parts.join(' ');
}
