// Named tokens bundled into one value: a type style is a font, a size, a weight, a line height.
import type { Ctx } from '../src/registry.ts';

export function compose(args: unknown, ctx: Ctx): unknown {
  return Object.fromEntries(
    Object.entries(args as Record<string, string>).map(([part, n]) => [part, ctx.get(n)]),
  );
}
