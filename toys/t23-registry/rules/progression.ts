// A step on a modular scale from math-utils: font-size-xl is base times ratio squared.
import { ratioValue } from '../../../packages/math-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';

export function progression(args: unknown, ctx: Ctx): unknown {
  const { base, ratio, step } = args as { base: string; ratio: string; step: number };
  const [, n, unit] = String(ctx.get(base)).match(/^(-?[\d.]+)([a-z%]*)$/) ?? [];
  if (n === undefined) throw new Error(`"${base}" is not a length`);
  return `${+(Number(n) * ratioValue(ctx.get(ratio) as { a: number; b: number }) ** step).toFixed(3)}${unit}`;
}
