/**
 * State Plugin
 *
 * Generates state variants (hover, active, focus, disabled) using pre-computed
 * state references from ColorValue intelligence data, or positional offsets
 * from the base token's actual position.
 */

import { definePlugin } from '@rafters/design-tokens';
import { ColorReferenceSchema, ColorValueSchema, INDEX_TO_POSITION } from '@rafters/shared';
import { z } from 'zod';

const StateInputSchema = z.object({
  familyColorValue: ColorValueSchema,
  familyName: z.string(),
  basePosition: z.number().int().min(0).max(10),
  stateType: z.enum(['hover', 'active', 'focus', 'disabled']),
});

type StateInput = z.infer<typeof StateInputSchema>;

type ExtendedColorValue = StateInput['familyColorValue'] & {
  stateReferences?: Record<string, { family: string; position: string }>;
};

const STATE_OFFSETS: Record<StateInput['stateType'], number> = {
  hover: 1,
  active: 2,
  focus: 1,
  disabled: -2,
};

export default definePlugin({
  id: 'state',
  input: StateInputSchema,
  output: ColorReferenceSchema,
  transform(input: StateInput) {
    const colorValue = input.familyColorValue as ExtendedColorValue;

    // Use pre-computed state references if available
    const precomputed = colorValue.stateReferences?.[input.stateType];
    if (precomputed) {
      return {
        family: precomputed.family,
        position: String(precomputed.position),
      };
    }

    // Derive from base position with offset
    const offset = STATE_OFFSETS[input.stateType];
    const adjustedIndex = Math.max(0, Math.min(10, input.basePosition + offset));
    const position = INDEX_TO_POSITION[adjustedIndex] ?? '500';

    return { family: input.familyName, position };
  },
});
