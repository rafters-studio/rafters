// Shared by the colour rules: follow a role to its family. Every read goes through ctx.get, so the registry sees it.
import type { ColorReference, ColorValue } from '../../../packages/shared/src/index.ts';
import type { Ctx } from '../src/registry.ts';

const isRef = (v: unknown): v is ColorReference =>
  typeof v === 'object' && v !== null && 'family' in v && 'position' in v;
const isFamily = (v: unknown): v is ColorValue =>
  typeof v === 'object' && v !== null && 'scale' in v;

/** A role or family name to its family, following one reference. */
export function family(name: string, ctx: Ctx): { name: string; value: ColorValue } {
  const v = ctx.get(name);
  const target = isRef(v) ? v.family : name;
  const f = isRef(v) ? ctx.get(target) : v;
  if (!isFamily(f)) throw new Error(`"${name}" is not a colour family or a role on one`);
  return { name: target, value: f };
}

/** A role to the reference it holds and its family. */
export function role(name: string, ctx: Ctx): { ref: ColorReference; family: ColorValue } {
  const v = ctx.get(name);
  if (!isRef(v)) throw new Error(`"${name}" is not a role`);
  return { ref: v, family: family(v.family, ctx).value };
}
