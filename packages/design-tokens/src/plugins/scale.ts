import { SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveFamily } from '../plugin.js';

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
    const result = resolveFamily(input.familyName, get);
    if (!result) {
      throw new Error(`scale plugin: family "${input.familyName}" not found in registry`);
    }
    const position = SCALE_POSITIONS[input.scalePosition];
    if (position === undefined) {
      throw new Error(`scale plugin: invalid position index ${input.scalePosition}`);
    }
    return { family: result.resolvedName, position };
  },
});
