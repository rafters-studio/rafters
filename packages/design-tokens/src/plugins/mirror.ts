import { SCALE_POSITIONS } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveParent } from '../plugin.js';

const MirrorInputSchema = z.object({
  fromToken: z.string(),
  offset: z.number().int().min(-10).max(10),
});

type MirrorInput = z.infer<typeof MirrorInputSchema>;

const LAST_INDEX = SCALE_POSITIONS.length - 1;

/**
 * Dark counterpart of a top-of-tree role, derived from its LIGHT token.
 *
 * The light position is mirrored across the scale (50 <-> 950, 500 <-> 500),
 * then shifted by the role's designed elevation offset (card sits 3 steps
 * lighter than background in dark mode). The family follows the light token,
 * so moving or reassigning the light role moves its dark counterpart, and
 * roles that share a light position stay distinct in dark (#1638).
 */
export const mirrorPlugin = definePlugin<MirrorInput, ColorReference>({
  name: 'mirror',
  inputSchema: MirrorInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.fromToken],
  transform: (input, get) => {
    const resolved = resolveParent(input.fromToken, get);
    if (!resolved) {
      throw new Error(`mirror plugin: "${input.fromToken}" could not resolve`);
    }
    const index = Math.min(
      LAST_INDEX,
      Math.max(0, LAST_INDEX - resolved.positionIndex + input.offset),
    );
    const position = SCALE_POSITIONS[index];
    if (position === undefined) {
      throw new Error(`mirror plugin: invalid position index ${index}`);
    }
    return { family: resolved.familyName, position };
  },
});
