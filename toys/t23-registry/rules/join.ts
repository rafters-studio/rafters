// Several tokens joined into one CSS value: a shadow's parts, a motion's duration and easing.
import type { Ctx } from '../src/registry.ts';

export function join(args: unknown, ctx: Ctx): unknown {
  return (args as { of: string[] }).of.map((n) => String(ctx.get(n))).join(' ');
}
