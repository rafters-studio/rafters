import { findDarkCounterpartIndex, SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveParent } from '../plugin.js';

const InvertInputSchema = z.object({
  fromToken: z.string(),
});

type InvertInput = z.infer<typeof InvertInputSchema>;

export const invertPlugin = definePlugin<InvertInput, ColorReference>({
  name: 'invert',
  inputSchema: InvertInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.fromToken],
  transform: (input, get) => {
    const parent = resolveParent(input.fromToken, get);
    if (!parent) {
      throw new Error(`invert plugin: "${input.fromToken}" could not resolve`);
    }
    const darkIndex = findDarkCounterpartIndex(parent.positionIndex, parent.family);
    const darkPosition = SCALE_POSITIONS[darkIndex];
    if (!darkPosition) {
      throw new Error(`invert plugin: invalid dark index ${darkIndex}`);
    }
    return { family: parent.familyName, position: darkPosition };
  },
});
