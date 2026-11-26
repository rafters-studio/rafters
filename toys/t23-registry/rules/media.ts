// A media query from a breakpoint.
import type { Ctx } from '../src/registry.ts';

export function media(args: unknown, ctx: Ctx): unknown {
  return `(min-width: ${String(ctx.get((args as { of: string }).of))})`;
}
