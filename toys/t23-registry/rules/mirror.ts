// The dark default of a role: its light position mirrored across the scale, shifted by the role's offset.
import { POSITION_TO_INDEX, SCALE_POSITIONS } from '../../../packages/color-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';
import { family } from './colour.ts';

export function mirror(args: unknown, ctx: Ctx): unknown {
  const { offset = 0 } = args as { offset?: number };
  const light = ctx.get(ctx.name, 'light') as { family: string; position: string };
  const last = SCALE_POSITIONS.length - 1;
  const index = Math.min(
    last,
    Math.max(0, last - (POSITION_TO_INDEX[light.position] ?? 0) + offset),
  );
  return {
    family: family(light.family, { ...ctx, get: (n) => ctx.get(n, 'light') }).name,
    position: SCALE_POSITIONS[index],
  };
}
