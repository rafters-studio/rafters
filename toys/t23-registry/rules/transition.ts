// A semantic motion: which properties transition, over a duration tier (or a set ms), with a curve.
import type { Ctx } from '../src/registry.ts';

export function transition(args: unknown, ctx: Ctx): unknown {
  const { properties, durationTier, curve, ms } = args as {
    properties: string[];
    durationTier: string;
    curve: string;
    ms?: number;
  };
  return {
    properties,
    duration: ms === undefined ? ctx.get(`rafters-duration-${durationTier}`) : `${ms}ms`,
    curve: ctx.get(`rafters-ease-${curve}`),
  };
}
