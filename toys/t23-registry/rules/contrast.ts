// A foreground on a role that meets WCAG, picked by color-utils; a fallback role when the role's own family has none.
import { semanticFor } from '../../../packages/color-utils/src/index.ts';
import type { Ctx } from '../src/registry.ts';
import { family, role } from './colour.ts';

export function contrast(args: unknown, ctx: Ctx): unknown {
  const {
    against,
    level = 'AAA',
    fallback,
  } = args as { against: string; level?: 'AA' | 'AAA'; fallback?: string };
  const parent = role(against, ctx);
  const back = fallback ? family(fallback, ctx) : undefined;
  const pair = semanticFor(parent.family, { name: parent.ref.family }).pair({
    use: 'foreground',
    from: parent.ref.position,
    level,
    ...(back ? { fallback: back.value } : {}),
  });
  const fromFallback =
    back !== undefined &&
    fallback !== undefined &&
    pair.to.family === back.name &&
    pair.to.family !== parent.ref.family;
  return { family: fromFallback ? fallback : pair.to.family, position: pair.to.position };
}
