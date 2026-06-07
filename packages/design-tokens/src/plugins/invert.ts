import { findDarkCounterpartIndex, SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema, type ColorValue } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin } from '../plugin.js';

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
    let resolved = get(input.familyName);
    let resolvedName = input.familyName;
    if (
      resolved &&
      typeof resolved === 'object' &&
      'family' in resolved &&
      'position' in resolved
    ) {
      resolvedName = (resolved as ColorReference).family;
      resolved = get(resolvedName);
    }
    const family = resolved as ColorValue | undefined;
    if (!family) {
      throw new Error(`invert plugin: family "${input.familyName}" not found in registry`);
    }
    const darkIndex = findDarkCounterpartIndex(input.basePosition, family);
    const darkPosition = SCALE_POSITIONS[darkIndex];
    if (!darkPosition) {
      throw new Error(
        `invert plugin: invalid dark index ${darkIndex} for base position ${input.basePosition}`,
      );
    }
    return { family: resolvedName, position: darkPosition };
  },
});
