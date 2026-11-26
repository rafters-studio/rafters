// A CSS value written as a template that names tokens: "fade-in {rafters-duration-fast} {rafters-ease-enter}".
import type { Ctx } from '../src/registry.ts';

export function css(args: unknown, ctx: Ctx): unknown {
  return (args as { template: string }).template.replace(/\{([\w-]+)\}/g, (_, name: string) =>
    String(ctx.get(name)),
  );
}
