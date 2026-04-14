/**
 * Contrast Plugin
 *
 * Finds the best contrast color using WCAG accessibility data from ColorValue.
 * Fallback to neutral family on no-WCAG-pair is preserved (issue #1231).
 *
 * The neutral family lookup is performed in resolveInput (registry context)
 * and passed as neutralFamilyName + neutralColorValue in the input struct.
 */

import { ColorReferenceSchema, ColorValueSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin } from '../plugins';
import { INDEX_TO_POSITION } from '../scale-positions';

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

      let contrastPosition: number | undefined;

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
