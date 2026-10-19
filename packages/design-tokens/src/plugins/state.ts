import { STATE_USES, type StateUse } from '@rafters/color-utils';
import { type ColorReference, ColorReferenceSchema, type OKLCH } from '@rafters/shared';
import { z } from 'zod';
import { definePlugin, requireSemanticParent, resolveParent } from '../plugin.js';

const StateTypeSchema = z.enum(STATE_USES as unknown as readonly [StateUse, ...StateUse[]]);

const StateInputSchema = z.object({
  from: z.string(),
  stateType: StateTypeSchema,
  /** ring only: the token the ring sits on. Optional so stored bindings still parse. */
  surface: z.string().optional(),
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
 *
 * A ring with a `surface` (a token name; the generator writes the mode's
 * `background`) is measured against that token and re-derives when it
 * changes.
 */
export const statePlugin = definePlugin<StateInput, ColorReference>({
  name: 'state',
  inputSchema: StateInputSchema,
  outputSchema: ColorReferenceSchema,
  dependsOn: (input) => (input.surface ? [input.from, input.surface] : [input.from]),
  transform: (input, get) => {
    const dark = input.from.includes('--dark');
    const { sem, resolved } = requireSemanticParent(input.from, get, 'state');
    const surface = input.surface ? surfaceColor(input.surface, get) : undefined;
    const pair = sem.pair({
      use: input.stateType,
      from: resolved.ref.position,
      dark,
      ...(surface ? { surface } : {}),
    });
    return { family: pair.to.family, position: pair.to.position };
  },
});

function surfaceColor(tokenName: string, get: (name: string) => unknown): OKLCH {
  const resolved = resolveParent(tokenName, get);
  const color = resolved?.family.scale[resolved.positionIndex];
  if (!color) throw new Error(`state plugin: "${tokenName}" could not resolve`);
  return color;
}
