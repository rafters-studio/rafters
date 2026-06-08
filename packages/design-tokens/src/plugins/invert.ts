import { findDarkCounterpartIndex, SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveFamily } from '../plugin.js';

const InvertInputSchema = z.object({
  familyName: z.string(),
  basePosition: z.number().int().min(0).max(10),
});

type InvertInput = z.infer<typeof InvertInputSchema>;

export const invertPlugin = definePlugin<InvertInput, ColorReference>({
  name: 'invert',
  inputSchema: InvertInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.familyName],
  transform: (input, get) => {
    const result = resolveFamily(input.familyName, get);
    if (!result) {
      throw new Error(`invert plugin: family "${input.familyName}" not found in registry`);
    }
    const darkIndex = findDarkCounterpartIndex(input.basePosition, result.family);
    const darkPosition = SCALE_POSITIONS[darkIndex];
    if (!darkPosition) {
      throw new Error(
        `invert plugin: invalid dark index ${darkIndex} for base position ${input.basePosition}`,
      );
    }
    return { family: result.resolvedName, position: darkPosition };
  },
});
