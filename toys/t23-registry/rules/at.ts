// A role: a family, or the family behind another role, at one position.
import { SCALE_POSITIONS } from '../../../packages/color-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';
import { family } from './colour.ts';

export function at(args: unknown, ctx: Ctx): unknown {
  const { of, position } = args as { of: string; position: string };
  if (!SCALE_POSITIONS.includes(position as (typeof SCALE_POSITIONS)[number]))
    throw new Error(`no position ${position}`);
  return { family: family(of, ctx).name, position };
}
