/**
 * Custom-property resolver for the explicit stylesheet import (#2763).
 *
 * Reads every `--name: value` declaration the importers read (`:root` rules
 * and `@theme` blocks; last declaration wins, as in `bases.ts`) and follows
 * each value's `var()` references inside the same file to a literal. A
 * `var(--x, fallback)` whose `--x` is not declared resolves to its fallback,
 * as CSS does. A reference to an undeclared property with no fallback, or a
 * cycle, leaves the property unresolved with the reason.
 *
 * Pure: string in, resolutions out. The CLI reads the file and decides what
 * each resolved value becomes.
 */

import { extractShadcnRoot } from './shadcn.js';
import { extractThemeBlocks } from './theme.js';

export type ResolvedCustomProperty =
  | { readonly property: `--${string}`; readonly value: string }
  | { readonly property: `--${string}`; readonly value: null; readonly reason: string };

class UnresolvedReference extends Error {}

/** Split `--x, fallback` at its first top-level comma. */
function splitVarArgs(inner: string): { name: string; fallback: string | null } {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      return { name: inner.slice(0, i).trim(), fallback: inner.slice(i + 1).trim() };
    }
  }
  return { name: inner.trim(), fallback: null };
}

export function resolveCustomProperties(css: string): readonly ResolvedCustomProperty[] {
  const declared = new Map<string, string>();
  for (const decl of [...extractShadcnRoot(css), ...extractThemeBlocks(css)]) {
    declared.set(decl.name, decl.value.trim());
  }

  const substitute = (value: string, seen: readonly string[]): string => {
    let out = value;
    for (let start = out.indexOf('var('); start !== -1; start = out.indexOf('var(')) {
      let depth = 0;
      let end = -1;
      for (let i = start + 3; i < out.length; i++) {
        if (out[i] === '(') depth++;
        else if (out[i] === ')' && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) throw new UnresolvedReference(`unbalanced var() in "${value}"`);
      const { name, fallback } = splitVarArgs(out.slice(start + 4, end));
      const key = name.replace(/^--/, '');
      const target = declared.get(key);
      let replacement: string;
      if (target !== undefined) {
        if (seen.includes(key)) {
          throw new UnresolvedReference(`var() cycle through --${[...seen, key].join(' -> --')}`);
        }
        replacement = substitute(target, [...seen, key]);
      } else if (fallback !== null) {
        replacement = substitute(fallback, seen);
      } else {
        throw new UnresolvedReference(`${name} is not declared in the file`);
      }
      out = `${out.slice(0, start)}${replacement}${out.slice(end + 1)}`;
    }
    return out;
  };

  const out: ResolvedCustomProperty[] = [];
  for (const [name, value] of declared) {
    const property = `--${name}` as const;
    try {
      out.push({ property, value: substitute(value, [name]) });
    } catch (err) {
      if (!(err instanceof UnresolvedReference)) throw err;
      out.push({ property, value: null, reason: err.message });
    }
  }
  return out;
}
