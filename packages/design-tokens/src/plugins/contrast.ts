import { semanticFor } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, resolveParent } from '../plugin.js';

const ContrastInputSchema = z.object({
  against: z.string(),
  level: z.enum(['AA', 'AAA']).default('AAA'),
});

type ContrastInput = z.infer<typeof ContrastInputSchema>;

/**
 * Find a WCAG-compliant foreground for a parent token's current value.
 *
 * Thin graph adapter: resolves the parent ColorReference via `get`, delegates
 * the selection to color-utils semanticFor (tokens is a graph, not colors).
 * The `against` input is a TOKEN NAME -- the cascade re-runs this transform
 * whenever that token's value changes, so the foreground always reflects the
 * parent's current family and position.
 */
export const contrastPlugin = definePlugin<ContrastInput, ColorReference>({
  name: 'contrast',
  inputSchema: ContrastInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.against],
  transform: (input, get) => {
    const resolved = resolveParent(input.against, get);
    if (!resolved) {
      throw new Error(`contrast plugin: "${input.against}" could not resolve`);
    }
    const sem = semanticFor(resolved.family, { name: resolved.familyName });
    const pair = sem.pair({ use: 'foreground', from: resolved.ref.position, level: input.level });
    return { family: pair.to.family, position: pair.to.position };
  },
});
