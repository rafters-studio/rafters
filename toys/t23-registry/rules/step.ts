// One step of a colour family's scale, as CSS.
import { oklchToCSS, POSITION_TO_INDEX } from '../../../packages/color-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';
import { family } from './colour.ts';

export function step(args: unknown, ctx: Ctx): unknown {
  const { of, position } = args as { of: string; position: string };
  const colour = family(of, ctx).value.scale[POSITION_TO_INDEX[position] ?? -1];
  if (!colour) throw new Error(`"${of}" has no step ${position}`);
  return oklchToCSS(colour);
}
