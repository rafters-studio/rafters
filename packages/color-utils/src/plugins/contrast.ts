/**
 * Contrast Plugin
 *
 * Finds the best contrast color using WCAG accessibility data from ColorValue.
 * Falls back to a neutral family when the source family has no WCAG-safe pair
 * for the base position.
 *
 * The neutral family lookup is performed in resolveInput (registry context)
 * and passed as neutralFamilyName + neutralColorValue in the input struct.
 */

import { definePlugin } from '@rafters/design-tokens';
import { ColorReferenceSchema, ColorValueSchema, INDEX_TO_POSITION } from '@rafters/shared';
import { z } from 'zod';

const ContrastInputSchema = z.object({
  familyColorValue: ColorValueSchema,
  familyName: z.string(),
  basePosition: z.number().int().min(0).max(10),
  neutralFamilyName: z.string().optional(),
  neutralColorValue: ColorValueSchema.optional(),
});

type ContrastInput = z.infer<typeof ContrastInputSchema>;

type ExtendedColorValue = ContrastInput['familyColorValue'] & {
  foregroundReferences?: {
    auto?: { family: string; position: string };
  };
};

function findPartnerInPairs(pairs: number[][], basePosition: number): number | undefined {
  for (const [p1, p2] of pairs) {
    if (p1 === basePosition) return p2;
    if (p2 === basePosition) return p1;
  }
  return undefined;
}

export default definePlugin({
  id: 'contrast',
  input: ContrastInputSchema,
  output: ColorReferenceSchema,
  transform(input: ContrastInput) {
    const colorValue = input.familyColorValue as ExtendedColorValue;

    // First priority: pre-computed foreground references
    if (colorValue.foregroundReferences?.auto) {
      const ref = colorValue.foregroundReferences.auto;
      return { family: ref.family, position: ref.position };
    }

    const basePosition = input.basePosition;

    // Second priority: WCAG accessibility data on the family itself
    if (colorValue.accessibility) {
      const wcagAAA = colorValue.accessibility.wcagAAA?.normal ?? [];
      const wcagAA = colorValue.accessibility.wcagAA?.normal ?? [];

      const contrastPosition =
        findPartnerInPairs(wcagAAA, basePosition) ?? findPartnerInPairs(wcagAA, basePosition);

      if (contrastPosition !== undefined) {
        return {
          family: input.familyName,
          position: INDEX_TO_POSITION[contrastPosition] ?? '500',
        };
      }
    }

    // Third priority: neutral family (passed from resolveInput)
    if (input.neutralFamilyName && input.neutralColorValue) {
      const neutralValue = input.neutralColorValue;
      if (
        neutralValue.accessibility?.onWhite?.aaa &&
        neutralValue.accessibility.onWhite.aaa.length > 0
      ) {
        const bestPosition = neutralValue.accessibility.onWhite.aaa[0];
        if (bestPosition !== undefined) {
          return {
            family: input.neutralFamilyName,
            position: INDEX_TO_POSITION[bestPosition] ?? '500',
          };
        }
      }
      if (
        neutralValue.accessibility?.onWhite?.aa &&
        neutralValue.accessibility.onWhite.aa.length > 0
      ) {
        const bestPosition = neutralValue.accessibility.onWhite.aa[0];
        if (bestPosition !== undefined) {
          return {
            family: input.neutralFamilyName,
            position: INDEX_TO_POSITION[bestPosition] ?? '500',
          };
        }
      }
      // Neutral family exists but no accessibility indices -- use positional heuristic
      return {
        family: input.neutralFamilyName,
        position: basePosition <= 5 ? '900' : '100',
      };
    }

    // Last resort: use same family with high contrast position
    return {
      family: input.familyName,
      position: basePosition <= 5 ? '900' : '100',
    };
  },
});
