/**
 * Contrast Rule Plugin
 *
 * Finds the best contrast color using sophisticated WCAG accessibility data
 * and pre-computed intelligence from ColorValue objects. This leverages the
 * AI-powered accessibility analysis to find optimal contrast pairs.
 */

import type { ColorValue } from '@rafters/shared';
import type { TokenRegistry } from '../registry';
import { INDEX_TO_POSITION } from '../scale-positions';

// Extended ColorValue with optional plugin-specific properties
type ExtendedColorValue = ColorValue & {
  foregroundReferences?: {
    auto?: { family: string; position: string | number };
  };
};

export default function contrast(
  registry: TokenRegistry,
  tokenName: string,
  dependencies: string[],
): { family: string; position: string | number } {
  // Get the base family from dependencies
  if (dependencies.length === 0) {
    throw new Error(`No dependencies found for contrast rule on token: ${tokenName}`);
  }

  const familyTokenName = dependencies[0];
  if (!familyTokenName) {
    throw new Error(`No dependency token name for contrast rule on token: ${tokenName}`);
  }
  const familyToken = registry.get(familyTokenName);

  if (!familyToken || typeof familyToken.value !== 'object') {
    throw new Error(`ColorValue family token ${familyTokenName} not found for contrast rule`);
  }

  const colorValue = familyToken.value as ExtendedColorValue;

  // First priority: Use pre-computed foreground references if available
  if (colorValue.foregroundReferences?.auto) {
    const reference = colorValue.foregroundReferences.auto;
    return {
      family: reference.family,
      position: reference.position,
    };
  }

  // Second priority: Extract base position from the semantic token name
  // e.g., "primary-foreground" -> look for "primary" to get base position
  const baseTokenMatch = tokenName.match(/^(.+)-(?:foreground|text|contrast)$/);
  let basePosition = 5; // Default middle position

  if (baseTokenMatch?.[1]) {
    const baseTokenName = baseTokenMatch[1];
    const baseToken = registry.get(baseTokenName);
    if (baseToken && typeof baseToken.value === 'object') {
      const baseRef = baseToken.value as { position?: string | number };
      if (baseRef.position) {
        basePosition =
          typeof baseRef.position === 'string'
            ? Math.floor(parseInt(baseRef.position, 10) / 100)
            : Math.floor(baseRef.position / 100);
      }
    }
  }

  // Third priority: Use WCAG accessibility data to find optimal contrast
  if (colorValue.accessibility) {
    const accessibility = colorValue.accessibility;

    // Try to find a contrast pair for the base position
    // Look in WCAG AAA first (higher standard), then AA
    const wcagAAA = accessibility.wcagAAA?.normal || [];
    const wcagAA = accessibility.wcagAA?.normal || [];

    // Find pairs where the first position matches our base
    let contrastPosition: number | undefined;

    // Try AAA first for highest quality
    for (const [pos1, pos2] of wcagAAA) {
      if (pos1 === basePosition) {
        contrastPosition = pos2;
        break;
      }
      if (pos2 === basePosition) {
        contrastPosition = pos1;
        break;
      }
    }

    // Fall back to AA if no AAA pair found
    if (contrastPosition === undefined) {
      for (const [pos1, pos2] of wcagAA) {
        if (pos1 === basePosition) {
          contrastPosition = pos2;
          break;
        }
        if (pos2 === basePosition) {
          contrastPosition = pos1;
          break;
        }
      }
    }

    if (contrastPosition !== undefined) {
      // Use the same family but different position for contrast
      return {
        family: familyTokenName,
        position: INDEX_TO_POSITION[contrastPosition] ?? '500',
      };
    }
  }

  // Fourth priority: Look for a neutral family in the registry
  const neutralFamilies = ['neutral-grayscale', 'neutral', 'gray', 'grey'];
  for (const neutralFamily of neutralFamilies) {
    const neutralToken = registry.get(neutralFamily);
    if (neutralToken && typeof neutralToken.value === 'object') {
      const neutralValue = neutralToken.value as ColorValue;

      // Use the neutral family's accessibility data if available
      if (neutralValue.accessibility) {
        const neutralAccessibility = neutralValue.accessibility;

        // For neutral families, prefer high contrast positions
        if (neutralAccessibility.onWhite?.aaa && neutralAccessibility.onWhite.aaa.length > 0) {
          const bestPosition = neutralAccessibility.onWhite.aaa[0]; // First AAA position
          if (bestPosition !== undefined) {
            return {
              family: neutralFamily,
              position: INDEX_TO_POSITION[bestPosition] ?? '500',
            };
          }
        }

        if (neutralAccessibility.onWhite?.aa && neutralAccessibility.onWhite.aa.length > 0) {
          const bestPosition = neutralAccessibility.onWhite.aa[0]; // First AA position
          if (bestPosition !== undefined) {
            return {
              family: neutralFamily,
              position: INDEX_TO_POSITION[bestPosition] ?? '500',
            };
          }
        }
      }

      // Fallback to standard positions
      return {
        family: neutralFamily,
        position: basePosition <= 5 ? '900' : '100', // Dark text for light backgrounds, light text for dark
      };
    }
  }

  // Last resort: Use same family with high contrast position
  return {
    family: familyTokenName ?? 'neutral',
    position: basePosition <= 5 ? '900' : '100',
  };
}
