// A length times a number, in the same unit: spacing-4 is spacing-base times 4.
import type { Ctx } from '../src/registry.ts';

export function multiply(args: unknown, ctx: Ctx): unknown {
  const { of, by } = args as { of: string; by: number };
  const [, n, unit] = String(ctx.get(of)).match(/^(-?[\d.]+)([a-z%]*)$/) ?? [];
  if (n === undefined) throw new Error(`"${of}" is not a length`);
  return `${+(Number(n) * by).toFixed(4)}${unit}`;
}
