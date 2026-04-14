/**
 * Invert Plugin
 *
 * Finds the WCAG-safe dark mode counterpart for a light mode scale position.
 * Uses the ColorValue accessibility matrix -- AAA first, falls back to AA
 * if the AAA match is too close (< 3 positions apart).
 */

import { ColorReferenceSchema, ColorValueSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin } from '../plugins';
import { findDarkCounterpartIndex, INDEX_TO_POSITION } from '../scale-positions';

const InvertInputSchema = z.object({
  familyColorValue: ColorValueSchema,
  familyName: z.string(),
  basePosition: z.number().int().min(0).max(10),
});

type InvertInput = z.infer<typeof InvertInputSchema>;

export default definePlugin({
  id: 'invert',
  input: InvertInputSchema,
  output: ColorReferenceSchema,
  transform(input: InvertInput) {
    const darkIndex = findDarkCounterpartIndex(input.basePosition, input.familyColorValue);
    const darkPosition = INDEX_TO_POSITION[darkIndex];
    if (!darkPosition) {
      throw new Error(`Invalid dark index ${darkIndex} for base position: ${input.basePosition}`);
    }
    return { family: input.familyName, position: darkPosition };
  },
});
