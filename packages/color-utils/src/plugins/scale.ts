/**
 * Scale-Position Plugin
 *
 * Extracts a color from a specific position in a ColorValue's scale array.
 * For position tokens (e.g., primary-600): returns a ColorReference.
 * The resolveColorReference step in applyComputed converts it to a CSS string.
 */

import { definePlugin } from '@rafters/design-tokens';
import { ColorReferenceSchema, ColorValueSchema, INDEX_TO_POSITION } from '@rafters/shared';
import { z } from 'zod';

const ScalePositionInputSchema = z.object({
  familyColorValue: ColorValueSchema,
  familyName: z.string(),
  scalePosition: z.number().int().min(0).max(10),
});

type ScalePositionInput = z.infer<typeof ScalePositionInputSchema>;

export default definePlugin({
  id: 'scale-position',
  input: ScalePositionInputSchema,
  output: ColorReferenceSchema,
  transform(input: ScalePositionInput) {
    const position = INDEX_TO_POSITION[input.scalePosition];
    if (position === undefined) {
      throw new Error(`Invalid scale position index: ${input.scalePosition}`);
    }
    return {
      family: input.familyName,
      position,
    };
  },
});
