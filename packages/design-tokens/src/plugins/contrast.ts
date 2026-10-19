import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, requireSemanticParent, resolveFamily } from '../plugin.js';

const ContrastInputSchema = z.object({
  against: z.string(),
  level: z.enum(['AA', 'AAA']).default('AAA'),
  /** The family (or role naming one) to fall back to when no in-family pair meets AA. Optional so stored bindings still parse. */
  fallback: z.string().optional(),
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
 *
 * With a `fallback` (the generator writes the `neutral` role), a parent whose
 * own family has no pair meeting AA takes the fallback family's best step.
 */
export const contrastPlugin = definePlugin<ContrastInput, ColorReference>({
  name: 'contrast',
  inputSchema: ContrastInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => (input.fallback ? [input.against, input.fallback] : [input.against]),
  transform: (input, get) => {
    const { sem, resolved } = requireSemanticParent(input.against, get, 'contrast');
    const fallback = input.fallback ? resolveFamily(input.fallback, get) : null;
    if (input.fallback && !fallback) {
      throw new Error(`contrast plugin: "${input.fallback}" could not resolve`);
    }
    const pair = sem.pair({
      use: 'foreground',
      from: resolved.ref.position,
      level: input.level,
      ...(fallback ? { fallback: fallback.family } : {}),
    });
    return { family: pair.to.family, position: pair.to.position };
  },
});
