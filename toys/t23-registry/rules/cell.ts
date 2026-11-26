// A motion cell: a keyframe over a duration tier with a curve, or looping on a period with none.
import type { Ctx } from '../src/registry.ts';

type Cell = {
  keyframe: string;
  duration: { kind: 'tier'; tier: string } | { kind: 'period'; period: string };
  curve?: string;
};

export function cell(args: unknown, ctx: Ctx): unknown {
  const { keyframe, duration, curve } = args as Cell;
  const length =
    duration.kind === 'tier'
      ? ctx.get(`rafters-duration-${duration.tier}`)
      : ctx.get(`rafters-period-${duration.period}`);
  return {
    keyframe,
    duration: length,
    ...(curve ? { curve: ctx.get(`rafters-ease-${curve}`) } : {}),
  };
}
