import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, requireSemanticParent } from '../plugin.js';

const InvertInputSchema = z.object({
  fromToken: z.string(),
});

type InvertInput = z.infer<typeof InvertInputSchema>;

/**
 * Dark counterpart by pair inversion (#1635).
 *
 * The light pair (parent + its WCAG foreground) is found first, then inverted
 * AS A UNIT via semanticFor -- the relationship survives instead of each leg
 * re-deriving independently. This token takes the inverted pair's background
 * leg; the foreground's dark token derives as contrast AGAINST this token
 * (see generators/semantic.ts deriveDarkBinding), so pair unity comes from
 * the derivation chain. All color math lives in color-utils.
 */
export const invertPlugin = definePlugin<InvertInput, ColorReference>({
  name: 'invert',
  inputSchema: InvertInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.fromToken],
  transform: (input, get) => {
    const { sem, resolved } = requireSemanticParent(input.fromToken, get, 'invert');
    const lightPair = sem.pair({ use: 'foreground', from: resolved.ref.position });
    const darkPair = sem.invert(lightPair);
    return { family: resolved.familyName, position: darkPair.from.position };
  },
});
