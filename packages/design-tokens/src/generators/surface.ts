/**
 * Surface Generator (FR-RAF-FILL-004)
 *
 * One fill per existing surface, stored in the fill namespace as
 * `surface-<name>` and exported as the `bg-surface-<name>` utility. Its parts
 * are references to that surface's own tokens (background `<name>`,
 * foreground `<name>-foreground`, border `<name>-border` when it exists), so
 * a surface cascades through the token chain exactly as its colour classes do.
 * A surface fill carries no new value and no state blocks.
 *
 * The surfaces are measured from the semantic defaults: every semantic `X`
 * with an `X-foreground` pair (`background` pairs with `foreground`), minus
 * the state names and any name whose `bg-surface-<name>` is already a colour
 * utility (a semantic `surface-<name>` exists, such as `surface-hover`).
 */

import type { Token } from '@rafters/shared';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS } from './defaults.js';
import type { GeneratorResult } from './types.js';

const STATE_SUFFIXES = [
  '-hover',
  '-active',
  '-focus',
  '-disabled',
  '-selected',
  '-invalid',
  '-valid',
];

/** The foreground a surface pairs with: `background` pairs with `foreground`. */
function foregroundOf(name: string): string {
  return name === 'background' ? 'foreground' : `${name}-foreground`;
}

/** The surface names measured from the semantic defaults, in their order. */
export function surfaceNames(): string[] {
  const semantic = new Set(Object.keys(DEFAULT_SEMANTIC_COLOR_MAPPINGS));
  return [...semantic].filter(
    (name) =>
      semantic.has(foregroundOf(name)) &&
      !name.endsWith('-foreground') &&
      !STATE_SUFFIXES.some((suffix) => name.endsWith(suffix)) &&
      !semantic.has(`surface-${name}`),
  );
}

export function generateSurfaceTokens(): GeneratorResult {
  const semantic = new Set(Object.keys(DEFAULT_SEMANTIC_COLOR_MAPPINGS));
  const tokens: Token[] = surfaceNames().map((name) => {
    const border = `${name}-border`;
    return {
      name: `surface-${name}`,
      value: {
        background: { color: { token: name } },
        foreground: { token: foregroundOf(name) },
        ...(semantic.has(border) && { border: { token: border } }),
      },
      category: 'fill',
      namespace: 'fill',
      semanticMeaning: `The ${name} surface: its background, foreground and border tokens`,
      containerQueryAware: true,
      userOverride: null,
    };
  });
  return { namespace: 'fill', tokens };
}
