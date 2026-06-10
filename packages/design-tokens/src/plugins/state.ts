import { type ColorReference, ColorReferenceSchema } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, requireSemanticParent } from '../plugin.js';

const StateTypeSchema = z.enum(['hover', 'active', 'focus', 'disabled']);

const StateInputSchema = z.object({
  from: z.string(),
  stateType: StateTypeSchema,
});

type StateInput = z.infer<typeof StateInputSchema>;

/**
 * Derive a state variant from a parent token's current value.
 *
 * Thin graph adapter: resolves the parent ColorReference via `get`, delegates
 * the ladder walk to color-utils semanticFor (tokens is a graph, not colors).
 * The `from` input is a TOKEN NAME -- the cascade re-runs this transform
 * whenever the parent's value changes, so the state variant always reflects
 * the parent's current family and position.
 */
export const statePlugin = definePlugin<StateInput, ColorReference>({
  name: 'state',
  inputSchema: StateInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => [input.from],
  transform: (input, get) => {
    const { sem, resolved } = requireSemanticParent(input.from, get, 'state');
    const pair = sem.pair({ use: input.stateType, from: resolved.ref.position });
    return { family: pair.to.family, position: pair.to.position };
  },
});
