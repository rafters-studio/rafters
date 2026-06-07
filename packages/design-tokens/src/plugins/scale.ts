import { SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema, type ColorValue } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin } from '../plugin.js';

const ScaleInputSchema = z.object({
  familyName: z.string(),
  scalePosition: z.number().int().min(0).max(10),
});

type ScaleInput = z.infer<typeof ScaleInputSchema>;

export const scalePlugin = definePlugin<ScaleInput, ColorReference>({
  name: 'scale',
  inputSchema: ScaleInputSchema,
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
      throw new Error(`scale plugin: family "${input.familyName}" not found in registry`);
    }
    const position = SCALE_POSITIONS[input.scalePosition];
    if (position === undefined) {
      throw new Error(`scale plugin: invalid position index ${input.scalePosition}`);
    }
    return { family: resolvedName, position };
  },
});
