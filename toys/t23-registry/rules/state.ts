// A state of a role (hover, active, focus, ring, border, subtle, disabled), picked by color-utils.
import {
  POSITION_TO_INDEX,
  semanticFor,
  type StateUse,
} from '../../../packages/color-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';
import { role } from './colour.ts';

export function state(args: unknown, ctx: Ctx): unknown {
  const { from, use, surface } = args as { from: string; use: StateUse; surface?: string };
  const parent = role(from, ctx);
  const on = surface ? role(surface, ctx) : undefined;
  const surfaceColour = on ? on.family.scale[POSITION_TO_INDEX[on.ref.position] ?? -1] : undefined;
  const pair = semanticFor(parent.family, { name: parent.ref.family }).pair({
    use,
    from: parent.ref.position,
    dark: ctx.mode === 'dark',
    ...(surfaceColour ? { surface: surfaceColour } : {}),
  });
  return { family: pair.to.family, position: pair.to.position };
}
