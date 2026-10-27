/**
 * Custom-property resolver for the explicit stylesheet import (#2763).
 *
 * Reads every `--name: value` declaration in top-level `:root` rules and
 * `@theme` blocks (last declaration wins, as in `bases.ts`). A `:root`
 * nested in any at-rule (`@media (prefers-color-scheme: dark)`, `@layer`)
 * is not read, so a dark-mode value never becomes the import. Follows
 * each value's `var()` references inside the same file to a literal. A
 * `var(--x, fallback)` whose `--x` is not declared resolves to its fallback,
 * as CSS does. A reference to an undeclared property with no fallback, or a
 * cycle, leaves the property unresolved with the reason.
 *
 * Pure: string in, resolutions out. The CLI reads the file and decides what
 * each resolved value becomes.
 */

import * as csstree from 'css-tree';
import { parsePaletteStep } from './family-seeds.js';
import type { CssDeclaration } from './shapes.js';
import { extractThemeBlocks } from './theme.js';

export type ResolvedCustomProperty =
  | { readonly property: `--${string}`; readonly value: string }
  | { readonly property: `--${string}`; readonly value: null; readonly reason: string };

class UnresolvedReference extends Error {}

/** `--name: value` declarations of `:root` rules at the top level of the sheet. */
function topLevelRoot(css: string): CssDeclaration[] {
  const out: CssDeclaration[] = [];
  const ast = csstree.parse(css);
  if (ast.type !== 'StyleSheet') return out;
  for (const node of ast.children) {
    if (node.type !== 'Rule') continue;
    const selectors = csstree
      .generate(node.prelude)
      .split(',')
      .map((s) => s.trim());
    if (!selectors.includes(':root')) continue;
    for (const decl of node.block.children) {
      if (decl.type !== 'Declaration' || !decl.property.startsWith('--')) continue;
      out.push({ name: decl.property.slice(2), value: csstree.generate(decl.value).trim() });
    }
  }
  return out;
}

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

/** Every declaration the resolver reads, by name without `--`; last one wins. */
function declaredProperties(css: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const decl of [...topLevelRoot(css), ...extractThemeBlocks(css)]) {
    declared.set(decl.name, decl.value.trim());
  }
  return declared;
}

/**
 * The palette step a property names (#2866): the property itself when it is
 * a declared `--color-<family>-<step>`, or the step a value of exactly
 * `var(--x)` reaches, followed through other declared properties. Null when
 * the chain ends anywhere else.
 */
export function resolvePaletteStep(
  css: string,
  property: string,
): { family: string; position: string } | null {
  const declared = declaredProperties(css);
  const seen = new Set<string>();
  for (let key = property.replace(/^--/, ''); declared.has(key) && !seen.has(key); ) {
    const step = parsePaletteStep(key);
    if (step !== null) return step;
    seen.add(key);
    const value = declared.get(key) ?? '';
    if (!value.startsWith('var(') || !value.endsWith(')')) return null;
    const { name } = splitVarArgs(value.slice(4, -1));
    if (!/^--[\w-]+$/.test(name)) return null;
    key = name.slice(2);
  }
  return null;
}

export function resolveCustomProperties(css: string): readonly ResolvedCustomProperty[] {
  const declared = declaredProperties(css);

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
